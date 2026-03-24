from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from api.models import Workout, Exercise, Set


def get_volume_per_session(user_id: int, db: Session) -> list[dict]:
    """Return total volume (weight × reps) per workout session, sorted by date.

    Uses a SQL SUM aggregate instead of loading all rows into Python —
    reduces ~1,200 lazy queries down to 1 query.
    """
    rows = (
        db.query(
            Workout.id,
            Workout.name,
            Workout.date,
            func.sum(Set.weight * Set.reps).label("volume"),
        )
        .join(Exercise, Exercise.workout_id == Workout.id)
        .join(Set, Set.exercise_id == Exercise.id)
        .filter(Workout.user_id == user_id)
        .filter(Set.weight.isnot(None))
        .filter(Set.reps.isnot(None))
        .group_by(Workout.id, Workout.name, Workout.date)
        .order_by(Workout.date, Workout.created_at)
        .all()
    )
    return [
        {
            "workout_id": r.id,
            "workout_name": r.name,
            "date": r.date,
            "volume": r.volume or 0.0,
        }
        for r in rows
    ]


def get_exercise_trend(exercise_name: str, user_id: int, db: Session) -> list[dict]:
    """Return per-session max weight and total volume for a specific exercise."""
    workouts = (
        db.query(Workout)
        .options(joinedload(Workout.exercises).joinedload(Exercise.sets))
        .filter(Workout.user_id == user_id)
        .order_by(Workout.date, Workout.created_at)
        .all()
    )

    result = []
    for workout in workouts:
        for exercise in workout.exercises:
            if exercise.name.lower() != exercise_name.lower():
                continue
            max_weight = max(
                (s.weight for s in exercise.sets if s.weight is not None),
                default=None,
            )
            volume = sum(
                s.weight * s.reps
                for s in exercise.sets
                if s.weight is not None and s.reps is not None
            )
            result.append({
                "date": workout.date,
                "workout_id": workout.id,
                "workout_name": workout.name,
                "max_weight": max_weight,
                "total_volume": volume,
            })

    return result
