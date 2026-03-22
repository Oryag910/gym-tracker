from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import User
from api.auth import get_current_user
from api.services import pr_service, stats_service, comparison_service

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/prs")
def get_prs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return pr_service.get_prs(current_user.id, db)


@router.get("/prs/{exercise_name}/history")
def get_pr_history(exercise_name: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return pr_service.get_pr_history(exercise_name, current_user.id, db)


@router.get("/volume")
def get_volume(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return stats_service.get_volume_per_session(current_user.id, db)


@router.get("/exercise/{exercise_name}/trend")
def get_exercise_trend(exercise_name: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return stats_service.get_exercise_trend(exercise_name, current_user.id, db)


@router.get("/compare")
def compare(
    workout_a: int,
    workout_b: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = comparison_service.compare_workouts(workout_a, workout_b, current_user.id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="One or both workouts not found")
    return result
