"""
Exercise lookup service.
Fetches exercise data (images + muscle groups) from the wger.de free API,
caches results in the exercise_cache SQLite table for 30 days.
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from api.models import ExerciseCache

logger = logging.getLogger(__name__)

WGER_BASE = "https://wger.de/api/v2"
CACHE_TTL_DAYS = 30

# wger muscle ID → our muscle name
MUSCLE_MAP = {
    1: "biceps",
    2: "shoulders",
    4: "chest",
    5: "triceps",
    6: "abs",
    7: "calves",
    8: "glutes",
    9: "traps",
    10: "quads",
    11: "hamstrings",
    12: "lats",
}

# Which muscles appear on the front vs back SVG view
FRONT_MUSCLES = {"chest", "shoulders", "biceps", "abs", "quads"}
BACK_MUSCLES = {"triceps", "lats", "traps", "hamstrings", "glutes", "calves"}


def _normalize(name: str) -> str:
    return name.lower().strip()


def _is_fresh(cached_at: datetime) -> bool:
    return datetime.utcnow() - cached_at < timedelta(days=CACHE_TTL_DAYS)


async def _fetch_wger(name: str) -> dict:
    """Call wger API to get exercise info. Returns dict or raises."""
    async with httpx.AsyncClient(timeout=8.0) as client:
        # Step 1: search for the exercise
        search_resp = await client.get(
            f"{WGER_BASE}/exercise/search/",
            params={"term": name, "language": "english", "format": "json"},
        )
        search_resp.raise_for_status()
        suggestions = search_resp.json().get("suggestions", [])

        if not suggestions:
            return {}

        best = suggestions[0]["data"]
        base_id = best.get("base_id") or best.get("id")
        if not base_id:
            return {}

        # Step 2: get muscle data
        detail_resp = await client.get(
            f"{WGER_BASE}/exercise/{base_id}/",
            params={"format": "json"},
        )
        detail_resp.raise_for_status()
        detail = detail_resp.json()

        muscles_primary = [
            MUSCLE_MAP[m] for m in detail.get("muscles", []) if m in MUSCLE_MAP
        ]
        muscles_secondary = [
            MUSCLE_MAP[m] for m in detail.get("muscles_secondary", []) if m in MUSCLE_MAP
        ]

        # Step 3: get exercise image
        img_resp = await client.get(
            f"{WGER_BASE}/exerciseimage/",
            params={"exercise_base": base_id, "format": "json", "is_main": "True"},
        )
        img_resp.raise_for_status()
        images = img_resp.json().get("results", [])
        image_url = images[0]["image"] if images else None

        return {
            "canonical_name": suggestions[0]["value"],
            "image_url": image_url,
            "muscles_primary": muscles_primary,
            "muscles_secondary": muscles_secondary,
        }


async def lookup_exercise(name: str, db: Session) -> dict:
    """
    Look up exercise info by name. Returns cached result if fresh,
    otherwise fetches from wger and caches.
    """
    key = _normalize(name)

    # Check cache
    cached = db.query(ExerciseCache).filter(ExerciseCache.search_key == key).first()
    if cached and _is_fresh(cached.cached_at):
        return {
            "canonical_name": cached.canonical_name,
            "image_url": cached.image_url,
            "muscles_primary": json.loads(cached.muscles_primary or "[]"),
            "muscles_secondary": json.loads(cached.muscles_secondary or "[]"),
        }

    # Fetch from wger
    try:
        data = await _fetch_wger(name)
    except Exception as exc:
        logger.warning("wger lookup failed for %r: %s", name, exc)
        data = {}

    # Upsert cache
    muscles_primary = data.get("muscles_primary", [])
    muscles_secondary = data.get("muscles_secondary", [])

    if cached:
        cached.canonical_name = data.get("canonical_name")
        cached.image_url = data.get("image_url")
        cached.muscles_primary = json.dumps(muscles_primary)
        cached.muscles_secondary = json.dumps(muscles_secondary)
        cached.cached_at = datetime.utcnow()
    else:
        cached = ExerciseCache(
            search_key=key,
            canonical_name=data.get("canonical_name"),
            image_url=data.get("image_url"),
            muscles_primary=json.dumps(muscles_primary),
            muscles_secondary=json.dumps(muscles_secondary),
        )
        db.add(cached)

    db.commit()

    return {
        "canonical_name": data.get("canonical_name"),
        "image_url": data.get("image_url"),
        "muscles_primary": muscles_primary,
        "muscles_secondary": muscles_secondary,
    }
