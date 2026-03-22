import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.database import get_db
from api.auth import get_current_user
from api.models import CustomExercise, User
from api.schemas import CustomExerciseCreate, CustomExerciseUpdate, CustomExerciseResponse
from api.services.exercise_service import MUSCLE_MAP

router = APIRouter(prefix="/library", tags=["library"])


def _ids_to_names(ids: list[int]) -> list[str]:
    return list(dict.fromkeys(MUSCLE_MAP[i] for i in ids if i in MUSCLE_MAP))


def _build_response(ex: CustomExercise) -> CustomExerciseResponse:
    pri_ids = json.loads(ex.muscles_primary_ids or "[]")
    sec_ids = json.loads(ex.muscles_secondary_ids or "[]")
    return CustomExerciseResponse(
        id=ex.id,
        name=ex.name,
        category=ex.category,
        muscles_primary=json.loads(ex.muscles_primary or "[]"),
        muscles_secondary=json.loads(ex.muscles_secondary or "[]"),
        muscles_primary_ids=pri_ids,
        muscles_secondary_ids=sec_ids,
        description=ex.description,
    )


@router.get("", response_model=list[CustomExerciseResponse])
def list_exercises(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    exercises = (
        db.query(CustomExercise)
        .filter(CustomExercise.user_id == current_user.id)
        .order_by(CustomExercise.name)
        .all()
    )
    return [_build_response(ex) for ex in exercises]


@router.post("", response_model=CustomExerciseResponse, status_code=201)
def create_exercise(
    body: CustomExerciseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pri_names = _ids_to_names(body.muscles_primary_ids)
    sec_names = _ids_to_names(body.muscles_secondary_ids)
    ex = CustomExercise(
        user_id=current_user.id,
        name=body.name.strip(),
        name_lower=body.name.strip().lower(),
        category=body.category,
        muscles_primary=json.dumps(pri_names),
        muscles_secondary=json.dumps(sec_names),
        muscles_primary_ids=json.dumps(body.muscles_primary_ids),
        muscles_secondary_ids=json.dumps(body.muscles_secondary_ids),
        description=body.description,
    )
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return _build_response(ex)


@router.get("/{exercise_id}", response_model=CustomExerciseResponse)
def get_exercise(
    exercise_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ex = db.query(CustomExercise).filter(
        CustomExercise.id == exercise_id,
        CustomExercise.user_id == current_user.id,
    ).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return _build_response(ex)


@router.put("/{exercise_id}", response_model=CustomExerciseResponse)
def update_exercise(
    exercise_id: int,
    body: CustomExerciseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ex = db.query(CustomExercise).filter(
        CustomExercise.id == exercise_id,
        CustomExercise.user_id == current_user.id,
    ).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")

    if body.name is not None:
        ex.name = body.name.strip()
        ex.name_lower = body.name.strip().lower()
    if body.category is not None:
        ex.category = body.category
    if body.description is not None:
        ex.description = body.description
    if body.muscles_primary_ids is not None:
        ex.muscles_primary_ids = json.dumps(body.muscles_primary_ids)
        ex.muscles_primary = json.dumps(_ids_to_names(body.muscles_primary_ids))
    if body.muscles_secondary_ids is not None:
        ex.muscles_secondary_ids = json.dumps(body.muscles_secondary_ids)
        ex.muscles_secondary = json.dumps(_ids_to_names(body.muscles_secondary_ids))

    db.commit()
    db.refresh(ex)
    return _build_response(ex)


@router.delete("/{exercise_id}", status_code=204)
def delete_exercise(
    exercise_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ex = db.query(CustomExercise).filter(
        CustomExercise.id == exercise_id,
        CustomExercise.user_id == current_user.id,
    ).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    db.delete(ex)
    db.commit()
