from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from api.database import get_db
from api.models import User, Workout, Exercise, Set
from api.schemas import WorkoutCreate, WorkoutUpdate, WorkoutResponse, WorkoutSummary, SetUpdate, SetCreate, ExerciseAddRequest, ExerciseUpdateRequest, ExerciseResponse, SetResponse
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
def list_workouts(
    limit: int = 0,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # limit=0 means no limit — preserves backward-compat for callers that don't pass params.
    # WorkoutsPage passes limit=20 for pagination.
    q = (
        db.query(Workout)
        .options(joinedload(Workout.exercises))
        .filter(Workout.user_id == current_user.id)
        .order_by(Workout.date.desc(), Workout.created_at.desc())
    )
    if limit > 0:
        q = q.limit(limit).offset(offset)
    return [_to_summary(w) for w in q.all()]


@router.post("", response_model=WorkoutResponse, status_code=201)
def create_workout(body: WorkoutCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workout = Workout(user_id=current_user.id, name=body.name, date=body.date)
    db.add(workout)
    db.flush()

    for idx, ex_data in enumerate(body.exercises):
        exercise = Exercise(
            workout_id=workout.id,
            name=ex_data.name,
            order_index=idx,
            is_unilateral=ex_data.is_unilateral,
            attachment=ex_data.attachment,
        )
        db.add(exercise)
        db.flush()

        for set_num, set_data in enumerate(ex_data.sets, start=1):
            s = Set(
                exercise_id=exercise.id,
                weight=set_data.weight,
                reps=set_data.reps,
                rpe=set_data.rpe,
                weight_right=set_data.weight_right,
                reps_right=set_data.reps_right,
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
    if body.weight_right is not None:
        set_.weight_right = body.weight_right
    if body.reps_right is not None:
        set_.reps_right = body.reps_right
    db.commit()
    return {
        "id": set_.id,
        "weight": set_.weight, "reps": set_.reps, "rpe": set_.rpe,
        "weight_right": set_.weight_right, "reps_right": set_.reps_right,
    }


@router.post("/{workout_id}/exercises", response_model=ExerciseResponse, status_code=201)
def add_exercise(
    workout_id: int,
    body: ExerciseAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workout = db.query(Workout).filter(Workout.id == workout_id, Workout.user_id == current_user.id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    max_order = max((ex.order_index for ex in workout.exercises), default=-1)
    exercise = Exercise(
        workout_id=workout.id,
        name=body.name.strip(),
        order_index=max_order + 1,
        is_unilateral=body.is_unilateral,
        attachment=body.attachment,
    )
    db.add(exercise)
    db.flush()
    # Add one empty set so the exercise isn't blank
    s = Set(exercise_id=exercise.id, set_number=1)
    db.add(s)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.put("/{workout_id}/exercises/{exercise_id}", response_model=ExerciseResponse)
def update_exercise(
    workout_id: int,
    exercise_id: int,
    body: ExerciseUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workout = db.query(Workout).filter(Workout.id == workout_id, Workout.user_id == current_user.id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id, Exercise.workout_id == workout_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    if body.name is not None:
        exercise.name = body.name.strip()
    if body.is_unilateral is not None:
        exercise.is_unilateral = body.is_unilateral
    if body.attachment is not None:
        exercise.attachment = body.attachment
    db.commit()
    db.refresh(exercise)
    return exercise


@router.delete("/{workout_id}/exercises/{exercise_id}", status_code=204)
def delete_exercise(
    workout_id: int,
    exercise_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workout = db.query(Workout).filter(Workout.id == workout_id, Workout.user_id == current_user.id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id, Exercise.workout_id == workout_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    db.delete(exercise)
    db.commit()


@router.post("/{workout_id}/exercises/{exercise_id}/sets", response_model=SetResponse, status_code=201)
def add_set(
    workout_id: int,
    exercise_id: int,
    body: SetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workout = db.query(Workout).filter(Workout.id == workout_id, Workout.user_id == current_user.id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id, Exercise.workout_id == workout_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    max_num = max((s.set_number for s in exercise.sets), default=0)
    s = Set(
        exercise_id=exercise_id,
        set_number=max_num + 1,
        weight=body.weight,
        reps=body.reps,
        rpe=body.rpe,
        weight_right=body.weight_right,
        reps_right=body.reps_right,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{workout_id}/exercises/{exercise_id}/sets/{set_id}", status_code=204)
def delete_set(
    workout_id: int,
    exercise_id: int,
    set_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workout = db.query(Workout).filter(Workout.id == workout_id, Workout.user_id == current_user.id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    set_ = db.query(Set).filter(Set.id == set_id, Set.exercise_id == exercise_id).first()
    if not set_:
        raise HTTPException(status_code=404, detail="Set not found")
    db.delete(set_)
    db.commit()
