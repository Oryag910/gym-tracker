"""
Exercise lookup service.
Fetches exercise data (images + muscle groups + descriptions) from the wger.de free API,
caches results in the exercise_cache SQLite table for 30 days.
"""
import json
import logging
from datetime import datetime, timedelta

import httpx
from sqlalchemy.orm import Session

from api.models import ExerciseCache

logger = logging.getLogger(__name__)

WGER_BASE = "https://wger.de/api/v2"
CACHE_TTL_DAYS = 30

# wger muscle ID → our muscle name (corrected mapping)
MUSCLE_MAP = {
    1: "biceps",
    2: "shoulders",      # anterior deltoid
    3: "serratus",
    4: "chest",
    5: "triceps",
    6: "hamstrings",     # biceps femoris
    7: "calves",         # gastrocnemius
    8: "glutes",
    9: "quads",          # quadriceps
    10: "lats",          # latissimus dorsi
    11: "hamstrings",    # duplicate, merges with 6
    12: "shoulders",     # deltoid (general)
    13: "abs",           # rectus abdominis
    14: "traps",         # trapezius
}

# Which wger muscle IDs appear on front vs back diagram
FRONT_IDS = {1, 2, 3, 4, 9, 13}
BACK_IDS = {5, 6, 7, 8, 10, 11, 12, 14}


def _normalize(name: str) -> str:
    return name.lower().strip()


def _is_fresh(cached_at: datetime) -> bool:
    return datetime.utcnow() - cached_at < timedelta(days=CACHE_TTL_DAYS)


def _is_complete(cached: ExerciseCache) -> bool:
    """Returns False if the cache row is missing the new fields (pre-migration data)."""
    return cached.muscles_primary_ids is not None


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

        # Step 2: get muscle data (raw IDs + mapped names)
        detail_resp = await client.get(
            f"{WGER_BASE}/exercise/{base_id}/",
            params={"format": "json"},
        )
        detail_resp.raise_for_status()
        detail = detail_resp.json()

        raw_primary_ids = [m for m in detail.get("muscles", []) if isinstance(m, int)]
        raw_secondary_ids = [m for m in detail.get("muscles_secondary", []) if isinstance(m, int)]

        muscles_primary = list(dict.fromkeys(
            MUSCLE_MAP[m] for m in raw_primary_ids if m in MUSCLE_MAP
        ))
        muscles_secondary = list(dict.fromkeys(
            MUSCLE_MAP[m] for m in raw_secondary_ids if m in MUSCLE_MAP
        ))

        # Step 3: get exercise image
        img_resp = await client.get(
            f"{WGER_BASE}/exerciseimage/",
            params={"exercise_base": base_id, "format": "json", "is_main": "True"},
        )
        img_resp.raise_for_status()
        images = img_resp.json().get("results", [])
        image_url = images[0]["image"] if images else None

        # Step 4: get description + category (separate call, non-fatal if it fails)
        description = None
        category = None
        try:
            info_resp = await client.get(
                f"{WGER_BASE}/exerciseinfo/{base_id}/",
                params={"format": "json", "language": "2"},
            )
            info_resp.raise_for_status()
            info = info_resp.json()
            category = info.get("category", {}).get("name")
            for translation in info.get("translations", []):
                if translation.get("language") == 2:
                    desc = translation.get("description", "").strip()
                    if desc:
                        description = desc
                    break
            # Fallback to top-level description
            if not description:
                description = info.get("description", "").strip() or None
        except Exception as exc:
            logger.warning("wger description fetch failed for base_id %s: %s", base_id, exc)

        return {
            "canonical_name": suggestions[0]["value"],
            "image_url": image_url,
            "muscles_primary": muscles_primary,
            "muscles_secondary": muscles_secondary,
            "muscles_primary_ids": raw_primary_ids,
            "muscles_secondary_ids": raw_secondary_ids,
            "description": description,
            "category": category,
        }


async def lookup_exercise(name: str, db: Session) -> dict:
    """
    Look up exercise info by name. Returns cached result if fresh and complete,
    otherwise fetches from wger and caches.
    """
    key = _normalize(name)

    # Check cache — must be fresh AND have the new fields
    cached = db.query(ExerciseCache).filter(ExerciseCache.search_key == key).first()
    if cached and _is_fresh(cached.cached_at) and _is_complete(cached):
        return {
            "canonical_name": cached.canonical_name,
            "image_url": cached.image_url,
            "muscles_primary": json.loads(cached.muscles_primary or "[]"),
            "muscles_secondary": json.loads(cached.muscles_secondary or "[]"),
            "muscles_primary_ids": json.loads(cached.muscles_primary_ids or "[]"),
            "muscles_secondary_ids": json.loads(cached.muscles_secondary_ids or "[]"),
            "description": cached.description,
            "category": cached.category,
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
    muscles_primary_ids = data.get("muscles_primary_ids", [])
    muscles_secondary_ids = data.get("muscles_secondary_ids", [])

    if cached:
        cached.canonical_name = data.get("canonical_name")
        cached.image_url = data.get("image_url")
        cached.muscles_primary = json.dumps(muscles_primary)
        cached.muscles_secondary = json.dumps(muscles_secondary)
        cached.muscles_primary_ids = json.dumps(muscles_primary_ids)
        cached.muscles_secondary_ids = json.dumps(muscles_secondary_ids)
        cached.description = data.get("description")
        cached.category = data.get("category")
        cached.cached_at = datetime.utcnow()
    else:
        cached = ExerciseCache(
            search_key=key,
            canonical_name=data.get("canonical_name"),
            image_url=data.get("image_url"),
            muscles_primary=json.dumps(muscles_primary),
            muscles_secondary=json.dumps(muscles_secondary),
            muscles_primary_ids=json.dumps(muscles_primary_ids),
            muscles_secondary_ids=json.dumps(muscles_secondary_ids),
            description=data.get("description"),
            category=data.get("category"),
        )
        db.add(cached)

    db.commit()

    return {
        "canonical_name": data.get("canonical_name"),
        "image_url": data.get("image_url"),
        "muscles_primary": muscles_primary,
        "muscles_secondary": muscles_secondary,
        "muscles_primary_ids": muscles_primary_ids,
        "muscles_secondary_ids": muscles_secondary_ids,
        "description": data.get("description"),
        "category": data.get("category"),
    }
