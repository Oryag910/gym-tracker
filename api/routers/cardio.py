from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.database import get_db
from api.auth import get_current_user
from api.models import CardioSession, CardioSegment, User
from api.schemas import CardioSessionCreate, CardioSessionResponse, CardioSessionSummary

router = APIRouter(prefix="/cardio", tags=["cardio"])


@router.get("", response_model=list[CardioSessionSummary])
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(CardioSession)
        .filter(CardioSession.user_id == current_user.id)
        .order_by(CardioSession.date.desc())
        .all()
    )


@router.post("", response_model=CardioSessionResponse, status_code=201)
def create_session(
    body: CardioSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    segments_data = body.segments
    session_data = body.model_dump(exclude={"segments"})
    session = CardioSession(user_id=current_user.id, **session_data)
    db.add(session)
    db.flush()  # get session.id without committing

    for i, seg in enumerate(segments_data):
        seg_dict = seg.model_dump()
        seg_dict["sort_order"] = i
        db.add(CardioSegment(session_id=session.id, **seg_dict))

    db.commit()
    db.refresh(session)
    return session


@router.get("/{session_id}", response_model=CardioSessionResponse)
def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(CardioSession).filter(
        CardioSession.id == session_id,
        CardioSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/{session_id}", status_code=204)
def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(CardioSession).filter(
        CardioSession.id == session_id,
        CardioSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
