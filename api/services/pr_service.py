from datetime import date
from typing import Optional
from sqlalchemy.orm import Session

from api.models import Workout, Exercise, Set


def get_prs(user_id: int, db: Session) -> list[dict]:
    """Return all-time PR (max weight) per exercise for a user, with the date it was achieved."""
    prs: dict[str, dict] = {}  # exercise_name -> {weight, date}

    workouts = db.query(Workout).filter(Workout.user_id == user_id).all()
    for workout in workouts:
        for exercise in workout.exercises:
            for s in exercise.sets:
                if s.weight is None:
                    continue
                name = exercise.name.lower()
                if name not in prs or s.weight > prs[name]["weight"]:
                    prs[name] = {"exercise": exercise.name, "weight": s.weight, "date": workout.date}

    return list(prs.values())


def get_pr_history(exercise_name: str, user_id: int, db: Session) -> list[dict]:
    """Return running max weight per date for a specific exercise (for trend chart)."""
    workouts = (
        db.query(Workout)
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
