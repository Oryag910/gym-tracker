from sqlalchemy.orm import Session
from api.models import Workout


def get_volume_per_session(user_id: int, db: Session) -> list[dict]:
    """Return total volume (weight × reps) per workout session, sorted by date."""
    workouts = (
        db.query(Workout)
        .filter(Workout.user_id == user_id)
        .order_by(Workout.date, Workout.created_at)
        .all()
    )

    result = []
    for workout in workouts:
        volume = 0.0
        for exercise in workout.exercises:
            for s in exercise.sets:
                if s.weight is not None and s.reps is not None:
                    volume += s.weight * s.reps
        result.append({
            "workout_id": workout.id,
            "workout_name": workout.name,
            "date": workout.date,
            "volume": volume,
        })
    return result


def get_exercise_trend(exercise_name: str, user_id: int, db: Session) -> list[dict]:
    """Return per-session max weight and total volume for a specific exercise."""
    workouts = (
        db.query(Workout)
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
