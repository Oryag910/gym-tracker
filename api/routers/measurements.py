from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.database import get_db
from api.auth import get_current_user
from api.models import Measurement, User
from api.schemas import MeasurementCreate, MeasurementResponse

router = APIRouter(prefix="/measurements", tags=["measurements"])


@router.get("", response_model=list[MeasurementResponse])
def list_measurements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Measurement)
        .filter(Measurement.user_id == current_user.id)
        .order_by(Measurement.date.desc())
        .all()
    )


@router.post("", response_model=MeasurementResponse, status_code=201)
def create_measurement(
    body: MeasurementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = Measurement(user_id=current_user.id, **body.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.delete("/{measurement_id}", status_code=204)
def delete_measurement(
    measurement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    m = db.query(Measurement).filter(
        Measurement.id == measurement_id,
        Measurement.user_id == current_user.id,
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Measurement not found")
    db.delete(m)
    db.commit()
