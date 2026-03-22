import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import PasswordResetToken, User
from api.schemas import (
    ForgotAccountRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    Token,
    UserLogin,
    UserRegister,
    UserResponse,
)
from api.auth import hash_password, verify_password, create_access_token
from api.services.email_service import (
    send_welcome_email,
    send_reset_email,
    send_account_recovery_email,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(body: UserRegister, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    background_tasks.add_task(send_welcome_email, user.email, user.username)
    return user


@router.post("/login", response_model=Token)
def login(body: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == body.email).first()
    if user:
        # Invalidate any existing unused tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False,  # noqa: E712
        ).update({"used": True})

        raw = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw.encode()).hexdigest()
        db.add(PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(minutes=30),
        ))
        db.commit()
        background_tasks.add_task(send_reset_email, user.email, user.username, raw)

    # Always return same response — prevents email enumeration
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(body.token.encode()).hexdigest()
    db_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used == False,  # noqa: E712
        PasswordResetToken.expires_at > datetime.utcnow(),
    ).first()
    if not db_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.query(User).filter(User.id == db_token.user_id).first()
    user.password_hash = hash_password(body.new_password)
    db_token.used = True
    db.commit()
    return {"message": "Password reset successfully"}


@router.post("/forgot-account")
async def forgot_account(
    body: ForgotAccountRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == body.email).first()
    if user:
        background_tasks.add_task(send_account_recovery_email, user.email, user.username)

    # Always return same response — prevents email enumeration
    return {"message": "If that email is registered, you'll receive an email shortly."}
