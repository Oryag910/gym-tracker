import json
import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from api.database import get_db
from api.auth import get_current_user
from api.models import GlobalExercise, User
from api.schemas import CustomExerciseCreate, CustomExerciseUpdate, CustomExerciseResponse
from api.services.exercise_service import MUSCLE_MAP

router = APIRouter(prefix="/library", tags=["library"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def _ids_to_names(ids: list[int]) -> list[str]:
    return list(dict.fromkeys(MUSCLE_MAP[i] for i in ids if i in MUSCLE_MAP))


def _to_response(ex: GlobalExercise) -> dict:
    pri_ids = json.loads(ex.muscles_primary_ids or "[]")
    sec_ids = json.loads(ex.muscles_secondary_ids or "[]")
    return {
        "id": ex.id,
        "name": ex.name,
        "category": ex.category,
        "image_url": ex.image_url,
        "muscles_primary": _ids_to_names(pri_ids),
        "muscles_secondary": _ids_to_names(sec_ids),
        "muscles_primary_ids": pri_ids,
        "muscles_secondary_ids": sec_ids,
        "description": ex.description,
    }


@router.get("")
def list_exercises(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    exercises = db.query(GlobalExercise).order_by(GlobalExercise.name).all()
    return [_to_response(ex) for ex in exercises]


@router.get("/search")
def search_exercises(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    key = q.lower().strip()
    exercises = (
        db.query(GlobalExercise)
        .filter(GlobalExercise.name_lower.contains(key))
        .order_by(GlobalExercise.name)
        .all()
    )
    return [_to_response(ex) for ex in exercises]


@router.post("", status_code=201)
def create_exercise(
    body: CustomExerciseCreate,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    pri_names = _ids_to_names(body.muscles_primary_ids)
    sec_names = _ids_to_names(body.muscles_secondary_ids)
    ex = GlobalExercise(
        name=body.name.strip(),
        name_lower=body.name.strip().lower(),
        category=body.category,
        image_url=body.image_url,
        muscles_primary=json.dumps(pri_names),
        muscles_secondary=json.dumps(sec_names),
        muscles_primary_ids=json.dumps(body.muscles_primary_ids),
        muscles_secondary_ids=json.dumps(body.muscles_secondary_ids),
        description=body.description,
    )
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return _to_response(ex)


@router.put("/{exercise_id}")
def update_exercise(
    exercise_id: int,
    body: CustomExerciseUpdate,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    ex = db.query(GlobalExercise).filter(GlobalExercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")

    if body.name is not None:
        ex.name = body.name.strip()
        ex.name_lower = body.name.strip().lower()
    if body.category is not None:
        ex.category = body.category
    if body.description is not None:
        ex.description = body.description
    if body.image_url is not None:
        ex.image_url = body.image_url
    if body.muscles_primary_ids is not None:
        ex.muscles_primary_ids = json.dumps(body.muscles_primary_ids)
        ex.muscles_primary = json.dumps(_ids_to_names(body.muscles_primary_ids))
    if body.muscles_secondary_ids is not None:
        ex.muscles_secondary_ids = json.dumps(body.muscles_secondary_ids)
        ex.muscles_secondary = json.dumps(_ids_to_names(body.muscles_secondary_ids))

    db.commit()
    db.refresh(ex)
    return _to_response(ex)


@router.delete("/{exercise_id}", status_code=204)
def delete_exercise(
    exercise_id: int,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    ex = db.query(GlobalExercise).filter(GlobalExercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    db.delete(ex)
    db.commit()


@router.get("/exercisedb-search")
async def exercisedb_search(
    q: str = Query(..., min_length=1),
    admin: User = Depends(_require_admin),
):
    """Proxy search to ExerciseDB API. Admin only — keeps API key server-side."""
    api_key = os.getenv("RAPIDAPI_KEY", "")
    if not api_key:
        return []
    try:
        encoded = q.lower().strip().replace(" ", "%20")
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"https://exercisedb.p.rapidapi.com/exercises/name/{encoded}",
                headers={
                    "X-RapidAPI-Key": api_key,
                    "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
                },
                params={"limit": "6", "offset": "0"},
            )
            if resp.status_code != 200:
                return []
            results = resp.json()
            return [
                {
                    "name": ex["name"].title(),
                    "gif_url": ex["gifUrl"],
                    "body_part": ex["bodyPart"].title(),
                    "target": ex["target"].title(),
                    "secondary_muscles": ex.get("secondaryMuscles", []),
                }
                for ex in results[:6]
            ]
    except Exception:
        return []
