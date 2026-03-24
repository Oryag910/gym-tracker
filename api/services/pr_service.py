from typing import Optional
from sqlalchemy import func, and_
from sqlalchemy.orm import Session, joinedload

from api.models import Workout, Exercise, Set


def get_prs(user_id: int, db: Session) -> list[dict]:
    """Return all-time PR (max weight) per exercise for a user, with the date it was achieved.

    Single query using a subquery join — fixes the PostgreSQL GROUP BY error
    (Exercise.name was selected without being in GROUP BY, which SQLite tolerates
    but PostgreSQL rejects) and reduces ~31 queries down to 1.
    """
    # Subquery: max weight per exercise name (case-insensitive)
    max_sq = (
        db.query(
            func.lower(Exercise.name).label("name_key"),
            func.max(Set.weight).label("max_w"),
        )
        .join(Set, Set.exercise_id == Exercise.id)
        .join(Workout, Exercise.workout_id == Workout.id)
        .filter(Workout.user_id == user_id)
        .filter(Set.weight.isnot(None))
        .group_by(func.lower(Exercise.name))
        .subquery()
    )

    # Join back to get earliest date when each PR weight was achieved
    rows = (
        db.query(
            func.lower(Exercise.name).label("name_key"),
            func.min(Exercise.name).label("name"),  # any capitalisation from the group
            max_sq.c.max_w.label("weight"),
            func.min(Workout.date).label("date"),
        )
        .join(Set, Set.exercise_id == Exercise.id)
        .join(Workout, Exercise.workout_id == Workout.id)
        .join(
            max_sq,
            and_(
                func.lower(Exercise.name) == max_sq.c.name_key,
                Set.weight == max_sq.c.max_w,
            ),
        )
        .filter(Workout.user_id == user_id)
        .filter(Set.weight.isnot(None))
        .group_by(func.lower(Exercise.name), max_sq.c.max_w)
        .all()
    )

    return [{"exercise": r.name, "weight": r.weight, "date": r.date} for r in rows]


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
