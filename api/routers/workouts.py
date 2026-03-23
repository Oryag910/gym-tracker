from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import User, Workout, Exercise, Set
from api.schemas import WorkoutCreate, WorkoutUpdate, WorkoutResponse, WorkoutSummary, SetUpdate
from api.auth import get_current_user

router = APIRouter(prefix="/workouts", tags=["workouts"])


def _to_summary(workout: Workout) -> WorkoutSummary:
    return WorkoutSummary(
        id=workout.id,
        name=workout.name,
        date=workout.date,
        exercise_count=len(workout.exercises),
    )


@router.get("", response_model=list[WorkoutSummary])
def list_workouts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workouts = (
        db.query(Workout)
        .filter(Workout.user_id == current_user.id)
        .order_by(Workout.date.desc(), Workout.created_at.desc())
        .all()
    )
    return [_to_summary(w) for w in workouts]


@router.post("", response_model=WorkoutResponse, status_code=201)
def create_workout(body: WorkoutCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workout = Workout(user_id=current_user.id, name=body.name, date=body.date)
    db.add(workout)
    db.flush()

    for idx, ex_data in enumerate(body.exercises):
        exercise = Exercise(workout_id=workout.id, name=ex_data.name, order_index=idx)
        db.add(exercise)
        db.flush()

        for set_num, set_data in enumerate(ex_data.sets, start=1):
            s = Set(
                exercise_id=exercise.id,
                weight=set_data.weight,
                reps=set_data.reps,
                rpe=set_data.rpe,
                set_number=set_num,
            )
            db.add(s)

    db.commit()
    db.refresh(workout)
    return workout


@router.get("/{workout_id}", response_model=WorkoutResponse)
def get_workout(workout_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workout = db.query(Workout).filter(Workout.id == workout_id, Workout.user_id == current_user.id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    return workout


@router.put("/{workout_id}", response_model=WorkoutResponse)
def update_workout(workout_id: int, body: WorkoutUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workout = db.query(Workout).filter(Workout.id == workout_id, Workout.user_id == current_user.id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    if body.name is not None:
        workout.name = body.name
    if body.date is not None:
        workout.date = body.date
    db.commit()
    db.refresh(workout)
    return workout


@router.delete("/{workout_id}", status_code=204)
def delete_workout(workout_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workout = db.query(Workout).filter(Workout.id == workout_id, Workout.user_id == current_user.id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    db.delete(workout)
    db.commit()


@router.put("/{workout_id}/exercises/{exercise_id}/sets/{set_id}", response_model=dict)
def update_set(
    workout_id: int,
    exercise_id: int,
    set_id: int,
    body: SetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify ownership via workout
    workout = db.query(Workout).filter(Workout.id == workout_id, Workout.user_id == current_user.id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    set_ = db.query(Set).filter(Set.id == set_id, Set.exercise_id == exercise_id).first()
    if not set_:
        raise HTTPException(status_code=404, detail="Set not found")

    if body.weight is not None:
        set_.weight = body.weight
    if body.reps is not None:
        set_.reps = body.reps
    if body.rpe is not None:
        set_.rpe = body.rpe
    db.commit()
    return {"id": set_.id, "weight": set_.weight, "reps": set_.reps, "rpe": set_.rpe}
