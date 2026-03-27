import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.database import engine, Base
from api.routers import auth, workouts, stats, exercises, global_exercises, measurements, cardio, templates

# Create all tables on startup (including exercise_cache)
Base.metadata.create_all(bind=engine)

# Migrate exercise_cache table — add new columns if they don't exist yet.
# Safe to run multiple times; silently skips existing columns.
import logging
from sqlalchemy import text as _text

_log = logging.getLogger(__name__)
_migrations = [
    ("exercise_cache", "muscles_primary_ids", "TEXT"),
    ("exercise_cache", "muscles_secondary_ids", "TEXT"),
    ("exercise_cache", "description", "TEXT"),
    ("exercise_cache", "category", "VARCHAR"),
    ("users", "is_admin", "BOOLEAN DEFAULT FALSE"),
    ("users", "unit_system", "VARCHAR DEFAULT 'imperial'"),
    ("users", "pref_weight",      "VARCHAR"),
    ("users", "pref_body_weight", "VARCHAR"),
    ("users", "pref_distance",    "VARCHAR"),
    ("users", "pref_measure",     "VARCHAR"),
    ("users", "pref_temp",        "VARCHAR"),
    ("sets",  "rpe",              "INTEGER"),
    ("exercises", "is_unilateral", "BOOLEAN DEFAULT FALSE"),
    ("exercises", "attachment",    "VARCHAR"),
    ("sets",      "weight_right",  "REAL"),
    ("sets",      "reps_right",    "INTEGER"),
    ("template_exercises", "is_unilateral", "BOOLEAN DEFAULT FALSE"),
    ("template_exercises", "attachment",    "VARCHAR"),
    ("exercises",          "is_timed",      "BOOLEAN DEFAULT FALSE"),
    ("sets",               "duration",      "INTEGER"),
]
# Create indexes for performance (safe to run multiple times)
_index_migrations = [
    "CREATE INDEX IF NOT EXISTS ix_workouts_user_id ON workouts (user_id)",
    "CREATE INDEX IF NOT EXISTS ix_exercises_workout_id ON exercises (workout_id)",
    "CREATE INDEX IF NOT EXISTS ix_sets_exercise_id ON sets (exercise_id)",
]
with engine.connect() as _conn:
    for _sql in _index_migrations:
        try:
            _conn.execute(_text(_sql))
            _conn.commit()
        except Exception as _e:
            _conn.rollback()
            _log.warning("index migration warning: %s", _e)

with engine.connect() as _conn:
    for _table, _col, _type in _migrations:
        try:
            _conn.execute(_text(f"ALTER TABLE {_table} ADD COLUMN {_col} {_type}"))
            _conn.commit()
            _log.info("%s: added column %s", _table, _col)
        except Exception as _e:
            _conn.rollback()
            if any(kw in str(_e).lower() for kw in ("duplicate", "already exists", "column")):
                pass
            else:
                _log.warning("migration warning (%s.%s): %s", _table, _col, _e)

# Ensure admin user has is_admin=True
_admin_username = os.getenv("ADMIN_USERNAME", "")
if _admin_username:
    with engine.connect() as _conn:
        _conn.execute(_text("UPDATE users SET is_admin = TRUE WHERE username = :u"), {"u": _admin_username})
        _conn.commit()
        _log.info("Admin flag set for user: %s", _admin_username)

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
app.include_router(global_exercises.router)
app.include_router(measurements.router)
app.include_router(cardio.router)
app.include_router(templates.router)


@app.get("/health")
def health():
    return {"status": "ok"}
