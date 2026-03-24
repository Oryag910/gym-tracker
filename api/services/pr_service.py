from typing import Optional
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from api.models import Workout, Exercise, Set


def get_prs(user_id: int, db: Session) -> list[dict]:
    """Return all-time PR (max weight) per exercise for a user, with the date it was achieved.

    Uses a SQL GROUP BY aggregate instead of loading all rows into Python —
    reduces ~1,200 lazy queries down to ~N+1 (N = unique exercise names, ~30).
    """
    # Step 1: one query — max weight per exercise name (case-insensitive)
    pr_rows = (
        db.query(
            func.lower(Exercise.name).label("name_key"),
            Exercise.name,
            func.max(Set.weight).label("weight"),
        )
        .join(Set, Set.exercise_id == Exercise.id)
        .join(Workout, Exercise.workout_id == Workout.id)
        .filter(Workout.user_id == user_id)
        .filter(Set.weight.isnot(None))
        .group_by(func.lower(Exercise.name))
        .all()
    )

    # Step 2: for each PR, find the earliest date that weight was hit
    result = []
    for row in pr_rows:
        date_row = (
            db.query(Workout.date)
            .join(Exercise, Exercise.workout_id == Workout.id)
            .join(Set, Set.exercise_id == Exercise.id)
            .filter(Workout.user_id == user_id)
            .filter(func.lower(Exercise.name) == row.name_key)
            .filter(Set.weight == row.weight)
            .order_by(Workout.date)
            .first()
        )
        result.append({
            "exercise": row.name,
            "weight": row.weight,
            "date": date_row[0] if date_row else None,
        })

    return result


def get_pr_history(exercise_name: str, user_id: int, db: Session) -> list[dict]:
    """Return running max weight per date for a specific exercise (for trend chart)."""
    workouts = (
        db.query(Workout)
        .options(joinedload(Workout.exercises).joinedload(Exercise.sets))
        .filter(Workout.user_id == user_id)
        .order_by(Workout.date)
        .all()
    )

    history = []
    running_max: Optional[float] = None

    for workout in workouts:
        for exercise in workout.exercises:
            if exercise.name.lower() != exercise_name.lower():
                continue
            session_max = max(
                (s.weight for s in exercise.sets if s.weight is not None),
                default=None,
            )
            if session_max is None:
                continue
            if running_max is None or session_max > running_max:
                running_max = session_max
            history.append({"date": workout.date, "weight": running_max})

    return history
