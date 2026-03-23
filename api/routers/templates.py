from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import User, WorkoutTemplate, TemplateExercise, TemplateSet
from api.schemas import (
    TemplateCreate, TemplateUpdate, TemplateResponse, TemplateSummary,
)
from api.auth import get_current_user

router = APIRouter(prefix="/templates", tags=["templates"])


def _to_summary(t: WorkoutTemplate) -> TemplateSummary:
    return TemplateSummary(
        id=t.id,
        name=t.name,
        description=t.description,
        default_set_rest=t.default_set_rest,
        default_exercise_rest=t.default_exercise_rest,
        exercise_count=len(t.exercises),
    )


def _build_exercises(db: Session, template_id: int, exercises_data):
    for idx, ex_data in enumerate(exercises_data):
        exercise = TemplateExercise(
            template_id=template_id,
            name=ex_data.name,
            order_index=idx,
            set_rest_override=ex_data.set_rest_override,
            exercise_rest_override=ex_data.exercise_rest_override,
        )
        db.add(exercise)
        db.flush()
        for s_data in ex_data.sets:
            s = TemplateSet(
                exercise_id=exercise.id,
                set_number=s_data.set_number,
                target_weight=s_data.target_weight,
                target_reps=s_data.target_reps,
            )
            db.add(s)


@router.get("", response_model=list[TemplateSummary])
def list_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    templates = (
        db.query(WorkoutTemplate)
        .filter(WorkoutTemplate.user_id == current_user.id)
        .order_by(WorkoutTemplate.created_at.desc())
        .all()
    )
    return [_to_summary(t) for t in templates]


@router.post("", response_model=TemplateResponse, status_code=201)
def create_template(
    body: TemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = WorkoutTemplate(
        user_id=current_user.id,
        name=body.name,
        description=body.description,
        default_set_rest=body.default_set_rest,
        default_exercise_rest=body.default_exercise_rest,
    )
    db.add(template)
    db.flush()
    _build_exercises(db, template.id, body.exercises)
    db.commit()
    db.refresh(template)
    return template


@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = db.query(WorkoutTemplate).filter(
        WorkoutTemplate.id == template_id,
        WorkoutTemplate.user_id == current_user.id,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/{template_id}", response_model=TemplateResponse)
def update_template(
    template_id: int,
    body: TemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = db.query(WorkoutTemplate).filter(
        WorkoutTemplate.id == template_id,
        WorkoutTemplate.user_id == current_user.id,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if body.name is not None:
        template.name = body.name
    if body.description is not None:
        template.description = body.description
    if body.default_set_rest is not None:
        template.default_set_rest = body.default_set_rest
    if body.default_exercise_rest is not None:
        template.default_exercise_rest = body.default_exercise_rest

    if body.exercises is not None:
        # Replace all exercises and sets
        for ex in template.exercises:
            db.delete(ex)
        db.flush()
        _build_exercises(db, template.id, body.exercises)

    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=204)
def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = db.query(WorkoutTemplate).filter(
        WorkoutTemplate.id == template_id,
        WorkoutTemplate.user_id == current_user.id,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(template)
    db.commit()
