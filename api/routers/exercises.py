from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from api.database import get_db
from api.auth import get_current_user
from api.models import User
from api.services.exercise_service import lookup_exercise

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("/lookup")
async def lookup(
    q: str = Query(..., min_length=1, description="Exercise name to look up"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Look up exercise info (image + muscles) by name. Results cached 30 days."""
    result = await lookup_exercise(q, db)
    return result
