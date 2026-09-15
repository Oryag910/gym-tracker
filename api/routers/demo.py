"""Recruiter demo entry point.

POST /demo/start              public: provision a sandbox, return a normal JWT
POST /demo/template/refresh   admin: rebuild the demo template from the caller's own account
GET  /demo/status             admin: counts
"""
import logging
import threading
import time

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from api.auth import create_access_token, get_current_user
from api.database import SessionLocal, get_db
from api.models import User
from api.schemas import Token
from api.services import demo_service

log = logging.getLogger(__name__)
router = APIRouter(prefix="/demo", tags=["demo"])

# Simple per-IP limiter for the public endpoint. In-memory is enough: one
# Railway instance, and the goal is only to stop a stuck button or a script
# from creating sandboxes in a loop.
RATE_LIMIT_COUNT = 10
RATE_LIMIT_WINDOW = 10 * 60  # seconds
_attempts: dict[str, list[float]] = {}
_attempts_lock = threading.Lock()


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_limited(ip: str) -> bool:
    now = time.monotonic()
    with _attempts_lock:
        recent = [t for t in _attempts.get(ip, []) if now - t < RATE_LIMIT_WINDOW]
        if len(recent) >= RATE_LIMIT_COUNT:
            _attempts[ip] = recent
            return True
        recent.append(now)
        _attempts[ip] = recent
        return False


def _cleanup_task() -> None:
    db = SessionLocal()
    try:
        demo_service.cleanup_sandboxes(db)
    except Exception:
        db.rollback()
        log.exception("demo sandbox cleanup failed")
    finally:
        db.close()


@router.post("/start", response_model=Token)
def start_demo(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if _rate_limited(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Too many demo sessions started. Please try again in a few minutes.")

    try:
        sandbox, counts = demo_service.provision_sandbox(db)
    except demo_service.DemoUnavailable:
        raise HTTPException(status_code=503, detail="The demo is not set up yet.")
    except Exception:
        db.rollback()
        log.exception("demo sandbox provisioning failed")
        raise HTTPException(status_code=500, detail="Could not prepare the demo. Please try again.")

    log.info("demo sandbox %s created: %s", sandbox.username, counts)
    background_tasks.add_task(_cleanup_task)

    token = create_access_token(sandbox.id, expires_delta=demo_service.SANDBOX_TTL)
    return {"access_token": token, "token_type": "bearer"}


def _require_admin(current_user: User) -> None:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")


@router.post("/template/refresh")
def refresh_template(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Snapshot the calling admin's own account into the demo template.

    The source is always the authenticated caller, so no user id is ever
    accepted from the client and no other account can be targeted.
    """
    _require_admin(current_user)
    if current_user.demo_role is not None:
        raise HTTPException(status_code=400, detail="Demo users cannot be a template source")
    try:
        return demo_service.refresh_template(db, current_user)
    except Exception:
        db.rollback()
        log.exception("demo template refresh failed")
        raise HTTPException(status_code=500, detail="Template refresh failed; nothing was changed.")


@router.get("/status")
def status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(current_user)
    return demo_service.demo_status(db)


@router.post("/cleanup")
def cleanup(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(current_user)
    return {"removed": demo_service.cleanup_sandboxes(db)}
