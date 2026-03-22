import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.database import engine, Base
from api.routers import auth, workouts, stats, exercises

# Create all tables on startup (including exercise_cache)
Base.metadata.create_all(bind=engine)

# Migrate exercise_cache table — add new columns if they don't exist yet.
# Safe to run multiple times; silently skips existing columns.
import logging
from sqlalchemy import text as _text

_log = logging.getLogger(__name__)
_new_cols = [
    ("muscles_primary_ids", "TEXT"),
    ("muscles_secondary_ids", "TEXT"),
    ("description", "TEXT"),
    ("category", "VARCHAR"),
]
with engine.connect() as _conn:
    for _col, _type in _new_cols:
        try:
            _conn.execute(_text(f"ALTER TABLE exercise_cache ADD COLUMN {_col} {_type}"))
            _conn.commit()
            _log.info("exercise_cache: added column %s", _col)
        except Exception as _e:
            _conn.rollback()
            if any(kw in str(_e).lower() for kw in ("duplicate", "already exists", "column")):
                pass  # column already present — expected on subsequent deploys
            else:
                _log.warning("exercise_cache migration warning: %s", _e)

app = FastAPI(title="Gym Tracker API", version="1.0.0")

allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(workouts.router)
app.include_router(stats.router)
app.include_router(exercises.router)


@app.get("/health")
def health():
    return {"status": "ok"}
