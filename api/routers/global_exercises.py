import json
import json as json_lib
import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from api.database import get_db
from api.auth import get_current_user
from api.models import GlobalExercise, User
from api.schemas import CustomExerciseCreate, CustomExerciseUpdate, CustomExerciseResponse, SuggestMusclesRequest
from api.services.exercise_service import MUSCLE_MAP

router = APIRouter(prefix="/library", tags=["library"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def _ids_to_names(ids: list[int]) -> list[str]:
    return list(dict.fromkeys(MUSCLE_MAP[i] for i in ids if i in MUSCLE_MAP))


def _to_response(ex: GlobalExercise) -> dict:
    pri_ids = json.loads(ex.muscles_primary_ids or "[]")
    sec_ids = json.loads(ex.muscles_secondary_ids or "[]")
    return {
        "id": ex.id,
        "name": ex.name,
        "category": ex.category,
        "image_url": ex.image_url,
        "muscles_primary": _ids_to_names(pri_ids),
        "muscles_secondary": _ids_to_names(sec_ids),
        "muscles_primary_ids": pri_ids,
        "muscles_secondary_ids": sec_ids,
        "description": ex.description,
    }


@router.get("")
def list_exercises(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    exercises = db.query(GlobalExercise).order_by(GlobalExercise.name).all()
    return [_to_response(ex) for ex in exercises]


@router.get("/search")
def search_exercises(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    key = q.lower().strip()
    exercises = (
        db.query(GlobalExercise)
        .filter(GlobalExercise.name_lower.contains(key))
        .order_by(GlobalExercise.name)
        .all()
    )
    return [_to_response(ex) for ex in exercises]


@router.post("", status_code=201)
def create_exercise(
    body: CustomExerciseCreate,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    pri_names = _ids_to_names(body.muscles_primary_ids)
    sec_names = _ids_to_names(body.muscles_secondary_ids)
    ex = GlobalExercise(
        name=body.name.strip(),
        name_lower=body.name.strip().lower(),
        category=body.category,
        image_url=body.image_url,
        muscles_primary=json.dumps(pri_names),
        muscles_secondary=json.dumps(sec_names),
        muscles_primary_ids=json.dumps(body.muscles_primary_ids),
        muscles_secondary_ids=json.dumps(body.muscles_secondary_ids),
        description=body.description,
    )
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return _to_response(ex)


@router.put("/{exercise_id}")
def update_exercise(
    exercise_id: int,
    body: CustomExerciseUpdate,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    ex = db.query(GlobalExercise).filter(GlobalExercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")

    if body.name is not None:
        ex.name = body.name.strip()
        ex.name_lower = body.name.strip().lower()
    if body.category is not None:
        ex.category = body.category
    if body.description is not None:
        ex.description = body.description
    if body.image_url is not None:
        ex.image_url = body.image_url
    if body.muscles_primary_ids is not None:
        ex.muscles_primary_ids = json.dumps(body.muscles_primary_ids)
        ex.muscles_primary = json.dumps(_ids_to_names(body.muscles_primary_ids))
    if body.muscles_secondary_ids is not None:
        ex.muscles_secondary_ids = json.dumps(body.muscles_secondary_ids)
        ex.muscles_secondary = json.dumps(_ids_to_names(body.muscles_secondary_ids))

    db.commit()
    db.refresh(ex)
    return _to_response(ex)


@router.delete("/{exercise_id}", status_code=204)
def delete_exercise(
    exercise_id: int,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    ex = db.query(GlobalExercise).filter(GlobalExercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    db.delete(ex)
    db.commit()


@router.post("/import-wger")
async def import_from_wger(
    limit: int = 50,
    offset: int = 0,
    admin: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    """Bulk-import exercises from wger.de that have images. Admin only."""
    from api.services.exercise_service import MUSCLE_MAP
    imported = 0
    skipped = 0

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Fetch exercises that have images
        img_resp = await client.get(
            "https://wger.de/api/v2/exerciseimage/",
            params={"format": "json", "limit": limit, "offset": offset},
        )
        img_resp.raise_for_status()
        img_data = img_resp.json()
        results = img_data.get("results", [])

        # Group images by exercise_base id (take first image per exercise)
        base_to_image: dict[int, str] = {}
        for img in results:
            base_id = img.get("exercise_base")
            if base_id and base_id not in base_to_image:
                base_to_image[base_id] = img["image"]

        for base_id, image_url in base_to_image.items():
            try:
                info_resp = await client.get(
                    f"https://wger.de/api/v2/exerciseinfo/{base_id}/",
                    params={"format": "json"},
                )
                if info_resp.status_code != 200:
                    skipped += 1
                    continue
                info = info_resp.json()

                # Get English name
                name = None
                description = None
                for t in info.get("translations", []):
                    if t.get("language") == 2:
                        name = t.get("name", "").strip()
                        desc = t.get("description", "").strip()
                        if desc:
                            description = desc
                        break
                if not name:
                    skipped += 1
                    continue

                # Skip if already exists (case-insensitive)
                existing = db.query(GlobalExercise).filter(
                    GlobalExercise.name_lower == name.lower()
                ).first()
                if existing:
                    skipped += 1
                    continue

                # Extract muscles
                raw_pri = [m for m in info.get("muscles", []) if isinstance(m, int)]
                raw_sec = [m for m in info.get("muscles_secondary", []) if isinstance(m, int)]
                category = info.get("category", {}).get("name") if info.get("category") else None

                ex = GlobalExercise(
                    name=name,
                    name_lower=name.lower(),
                    category=category,
                    image_url=image_url,
                    muscles_primary=json.dumps(_ids_to_names(raw_pri)),
                    muscles_secondary=json.dumps(_ids_to_names(raw_sec)),
                    muscles_primary_ids=json.dumps(raw_pri),
                    muscles_secondary_ids=json.dumps(raw_sec),
                    description=description,
                )
                db.add(ex)
                imported += 1
            except Exception:
                skipped += 1
                continue

    db.commit()
    return {"imported": imported, "skipped": skipped, "total_in_batch": len(base_to_image)}


@router.post("/suggest-muscles")
async def suggest_muscles(
    body: SuggestMusclesRequest,
    admin: User = Depends(_require_admin),
):
    """Call Gemini Flash to suggest primary/secondary muscle IDs for an exercise. Admin only."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured")

    muscle_list = "\n".join(f"{k}: {v}" for k, v in MUSCLE_MAP.items())

    prompt = (
        f'You are a fitness anatomy expert. For the exercise "{body.name}", '
        f"identify which muscles are primarily and secondarily engaged.\n\n"
        f"Available muscle IDs:\n{muscle_list}\n\n"
        f'Respond with ONLY valid JSON: {{"primary": [list of integer IDs], "secondary": [list of integer IDs]}}\n\n'
        f"Rules:\n"
        f"- Primary: main movers (directly activated muscles)\n"
        f"- Secondary: stabilisers and synergists\n"
        f"- No muscle can appear in both lists\n"
        f"- Only use IDs from the list above"
    )

    try:
        # Call Gemini REST API directly — no SDK, no version conflicts
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
                params={"key": api_key},
                json={"contents": [{"parts": [{"text": prompt}]}]},
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Gemini API error: {resp.status_code} {resp.json().get('error', {}).get('message', resp.text[:200])}")
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        result = json_lib.loads(text)
    except HTTPException:
        raise
    except json_lib.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response — Gemini returned unexpected output")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {str(e)}")

    valid = set(MUSCLE_MAP.keys())
    primary = [i for i in result.get("primary", []) if i in valid]
    secondary = [i for i in result.get("secondary", []) if i in valid and i not in primary]

    return {"muscles_primary_ids": primary, "muscles_secondary_ids": secondary}


@router.get("/exercisedb-search")
async def exercisedb_search(
    q: str = Query(..., min_length=1),
    admin: User = Depends(_require_admin),
):
    """Proxy search to ExerciseDB API. Admin only — keeps API key server-side."""
    api_key = os.getenv("RAPIDAPI_KEY", "")
    if not api_key:
        return []
    try:
        encoded = q.lower().strip().replace(" ", "%20")
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"https://exercisedb.p.rapidapi.com/exercises/name/{encoded}",
                headers={
                    "X-RapidAPI-Key": api_key,
                    "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
                },
                params={"limit": "6", "offset": "0"},
            )
            if resp.status_code != 200:
                return []
            results = resp.json()
            return [
                {
                    "name": ex["name"].title(),
                    "gif_url": ex["gifUrl"],
                    "body_part": ex["bodyPart"].title(),
                    "target": ex["target"].title(),
                    "secondary_muscles": ex.get("secondaryMuscles", []),
                }
                for ex in results[:6]
            ]
    except Exception:
        return []
