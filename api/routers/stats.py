from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from api.database import get_db
from api.models import User, Workout, Exercise, Set
from api.auth import get_current_user
from api.services import pr_service, stats_service, comparison_service

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/dashboard")
def get_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Compact summary for the Dashboard page — replaces two expensive full-table fetches."""
    # Total workout count
    total = db.query(func.count(Workout.id)).filter(Workout.user_id == current_user.id).scalar()

    # This-week count
    week_ago = date.today() - timedelta(days=7)
    this_week = db.query(func.count(Workout.id)).filter(
        Workout.user_id == current_user.id,
        Workout.date >= week_ago,
    ).scalar()

    # All-time total volume (SUM done in SQL, not Python)
    total_volume = (
        db.query(func.sum(Set.weight * Set.reps))
        .join(Exercise, Set.exercise_id == Exercise.id)
        .join(Workout, Exercise.workout_id == Workout.id)
        .filter(Workout.user_id == current_user.id)
        .filter(Set.weight.isnot(None))
        .filter(Set.reps.isnot(None))
        .scalar() or 0.0
    )

    # 5 most recent workouts — joinedload avoids N+1 for exercise counts
    recent = (
        db.query(Workout)
        .options(joinedload(Workout.exercises))
        .filter(Workout.user_id == current_user.id)
        .order_by(Workout.date.desc(), Workout.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "total_workouts": total,
        "this_week": this_week,
        "total_volume": total_volume,
        "recent": [
            {"id": w.id, "name": w.name, "date": str(w.date), "exercise_count": len(w.exercises)}
            for w in recent
        ],
    }


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
