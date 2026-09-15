"""Pytest fixtures for the recruiter-demo feature tests.

IMPORTANT: api.main runs Base.metadata.create_all(...) plus a series of ad-hoc
ALTER TABLE migrations against DATABASE_URL *at import time* (see api/main.py).
So the DATABASE_URL / SECRET_KEY env vars must be set before anything under
`api` is imported anywhere in the test session. That's why this happens at the
very top of this file, before any `import api...` line.
"""
import os
import tempfile
import uuid

_tmpdir = tempfile.mkdtemp(prefix="gymtracker_test_")
_db_path = os.path.join(_tmpdir, "test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"
os.environ["SECRET_KEY"] = "pytest-secret-key-do-not-use-in-prod"
os.environ["ADMIN_USERNAME"] = ""  # don't let a leftover shell env var auto-admin a test user

from datetime import date, timedelta  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import func  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from api.main import app  # noqa: E402
from api import database as db_module  # noqa: E402
from api.models import (  # noqa: E402
    CardioSegment,
    CardioSession,
    Exercise,
    Measurement,
    Set,
    TemplateExercise,
    TemplateSet,
    User,
    Workout,
    WorkoutTemplate,
)
import api.routers.demo as demo_router  # noqa: E402

# ---------------------------------------------------------------------------
# App wiring: override get_db with a session bound to the same test engine
# ---------------------------------------------------------------------------

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_module.engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[db_module.get_db] = _override_get_db


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def _reset_rate_limit():
    """The /demo/start limiter is a module-level in-memory dict keyed by IP.
    TestClient always looks like the same client, so tests would bleed into
    each other's rate-limit counters without this.
    """
    demo_router._attempts.clear()
    yield
    demo_router._attempts.clear()


# ---------------------------------------------------------------------------
# Helpers (plain functions, not fixtures, so each test can compose them)
# ---------------------------------------------------------------------------

def unique(prefix="u"):
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def register_and_login(client, username=None, password="Testpass123!", email=None):
    username = username or unique("user")
    email = email or f"{username}@example.com"
    r = client.post("/auth/register", json={"username": username, "email": email, "password": password})
    assert r.status_code == 201, r.text
    user_id = r.json()["id"]
    r = client.post("/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    return {"username": username, "email": email, "password": password, "user_id": user_id, "token": token}


def make_admin(db_session, user_id):
    user = db_session.query(User).filter(User.id == user_id).first()
    user.is_admin = True
    db_session.commit()


def seed_workout(client, token, name="Push Day", day_offset=0, weight=135.0):
    d = (date.today() - timedelta(days=day_offset)).isoformat()
    body = {
        "name": name,
        "date": d,
        "exercises": [
            {
                "name": "Bench Press",
                "is_unilateral": False,
                "is_timed": False,
                "sets": [
                    {"weight": weight, "reps": 5},
                    {"weight": weight - 10, "reps": 8},
                ],
            }
        ],
    }
    r = client.post("/workouts", json=body, headers=auth_headers(token))
    assert r.status_code == 201, r.text
    return r.json()


def seed_template(client, token, name="Full Body"):
    body = {
        "name": name,
        "description": "A template with some description",
        "default_set_rest": 90,
        "default_exercise_rest": 120,
        "exercises": [
            {
                "name": "Squat",
                "order_index": 0,
                "sets": [{"set_number": 1, "target_weight": 100, "target_reps": 5}],
                "is_unilateral": False,
            }
        ],
    }
    r = client.post("/templates", json=body, headers=auth_headers(token))
    assert r.status_code == 201, r.text
    return r.json()


def seed_cardio(client, token, name="Morning Run", notes="felt great today"):
    body = {
        "date": date.today().isoformat(),
        "name": name,
        "activity_type": "run",
        "total_distance": 5.0,
        "total_duration": 30.0,
        "notes": notes,
        "segments": [
            {"sort_order": 0, "label": "warmup", "segment_type": "warmup",
             "distance": 1.0, "duration": 6.0, "notes": "easy pace, felt loose"},
            {"sort_order": 1, "label": "main", "segment_type": "moderate",
             "distance": 4.0, "duration": 24.0},
        ],
    }
    r = client.post("/cardio", json=body, headers=auth_headers(token))
    assert r.status_code == 201, r.text
    return r.json()


def seed_measurement(client, token):
    body = {"date": date.today().isoformat(), "weight": 180.0, "notes": "private health note"}
    r = client.post("/measurements", json=body, headers=auth_headers(token))
    assert r.status_code == 201, r.text
    return r.json()


def row_counts(db, user_id) -> dict:
    """Counts of every row type a user can own, using the same join shape demo_service uses."""
    return {
        "workouts": db.query(func.count(Workout.id)).filter(Workout.user_id == user_id).scalar(),
        "exercises": db.query(func.count(Exercise.id)).join(Workout, Exercise.workout_id == Workout.id)
            .filter(Workout.user_id == user_id).scalar(),
        "sets": db.query(func.count(Set.id)).join(Exercise, Set.exercise_id == Exercise.id)
            .join(Workout, Exercise.workout_id == Workout.id).filter(Workout.user_id == user_id).scalar(),
        "templates": db.query(func.count(WorkoutTemplate.id)).filter(WorkoutTemplate.user_id == user_id).scalar(),
        "template_exercises": db.query(func.count(TemplateExercise.id))
            .join(WorkoutTemplate, TemplateExercise.template_id == WorkoutTemplate.id)
            .filter(WorkoutTemplate.user_id == user_id).scalar(),
        "template_sets": db.query(func.count(TemplateSet.id))
            .join(TemplateExercise, TemplateSet.exercise_id == TemplateExercise.id)
            .join(WorkoutTemplate, TemplateExercise.template_id == WorkoutTemplate.id)
            .filter(WorkoutTemplate.user_id == user_id).scalar(),
        "cardio_sessions": db.query(func.count(CardioSession.id)).filter(CardioSession.user_id == user_id).scalar(),
        "cardio_segments": db.query(func.count(CardioSegment.id))
            .join(CardioSession, CardioSegment.session_id == CardioSession.id)
            .filter(CardioSession.user_id == user_id).scalar(),
        "measurements": db.query(func.count(Measurement.id)).filter(Measurement.user_id == user_id).scalar(),
    }


def data_checksum(db, user_id):
    """Sorted (date, workout name, exercise names, set weights) snapshot for equality checks."""
    workouts = db.query(Workout).filter(Workout.user_id == user_id).all()
    out = []
    for w in workouts:
        ex_names = tuple(sorted(e.name for e in w.exercises))
        weights = tuple(sorted(
            s.weight for e in w.exercises for s in e.sets if s.weight is not None
        ))
        out.append((str(w.date), w.name, ex_names, weights))
    return sorted(out)


@pytest.fixture()
def admin_with_data(client, db_session):
    """A real admin account with 3 workouts, 1 template, 1 cardio session (with notes), 1 measurement."""
    admin = register_and_login(client)
    make_admin(db_session, admin["user_id"])
    w1 = seed_workout(client, admin["token"], name="Push Day", day_offset=10, weight=135)
    w2 = seed_workout(client, admin["token"], name="Pull Day", day_offset=5, weight=95)
    w3 = seed_workout(client, admin["token"], name="Legs- home gym", day_offset=2, weight=225)
    tmpl = seed_template(client, admin["token"])
    cardio = seed_cardio(client, admin["token"])
    meas = seed_measurement(client, admin["token"])
    admin["workouts"] = [w1, w2, w3]
    admin["template"] = tmpl
    admin["cardio"] = cardio
    admin["measurement"] = meas
    return admin


@pytest.fixture()
def refreshed_template(client, admin_with_data):
    """admin_with_data, plus the demo template has been (re)built from it."""
    r = client.post("/demo/template/refresh", headers=auth_headers(admin_with_data["token"]))
    assert r.status_code == 200, r.text
    return admin_with_data, r.json()
