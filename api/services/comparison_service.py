from sqlalchemy.orm import Session
from api.models import Workout


def compare_workouts(workout_a_id: int, workout_b_id: int, user_id: int, db: Session) -> dict:
    """Return side-by-side comparison of two workouts, aligned by exercise name."""
    wa = db.query(Workout).filter(Workout.id == workout_a_id, Workout.user_id == user_id).first()
    wb = db.query(Workout).filter(Workout.id == workout_b_id, Workout.user_id == user_id).first()

    if not wa or not wb:
        return None

    # Build exercise maps (lowercase name -> sets)
    def exercise_map(workout):
        return {ex.name.lower(): ex for ex in workout.exercises}

    map_a = exercise_map(wa)
    map_b = exercise_map(wb)

    all_names = sorted(set(map_a.keys()) | set(map_b.keys()))

    exercises = []
    for name in all_names:
        ex_a = map_a.get(name)
        ex_b = map_b.get(name)
        exercises.append({
            "exercise": ex_a.name if ex_a else ex_b.name,
            "workout_a": [
                {"id": s.id, "set_number": s.set_number, "weight": s.weight, "reps": s.reps}
                for s in ex_a.sets
            ] if ex_a else None,
            "workout_b": [
                {"id": s.id, "set_number": s.set_number, "weight": s.weight, "reps": s.reps}
                for s in ex_b.sets
            ] if ex_b else None,
        })

    return {
        "workout_a": {"id": wa.id, "name": wa.name, "date": wa.date, "exercise_count": len(wa.exercises)},
        "workout_b": {"id": wb.id, "name": wb.name, "date": wb.date, "exercise_count": len(wb.exercises)},
        "exercises": exercises,
    }
