"""Targeted tests for the recruiter-demo feature (api/services/demo_service.py, api/routers/demo.py).

Order matters for test_demo_start_returns_503_without_template: it must run
before any fixture that creates the demo template, so it stays first in this
file (pytest runs tests in file order by default; no random-order plugin is
installed).
"""
from datetime import date, datetime, timedelta

from sqlalchemy import func

from api import auth as auth_module
from api.models import CardioSegment, CardioSession, Exercise, Set, TemplateExercise, TemplateSet, User, Workout
from api.services import demo_service

from tests.conftest import (
    auth_headers,
    data_checksum,
    register_and_login,
    row_counts,
    seed_workout,
    unique,
)


# 1. No template yet -> 503 -----------------------------------------------

def test_demo_start_returns_503_without_template(client, db_session):
    assert demo_service.get_template_user(db_session) is None
    r = client.post("/demo/start")
    assert r.status_code == 503


# 2. Template refresh: admin-only, correct counts/sanitization ------------

def test_template_refresh_forbidden_for_non_admin(client):
    user = register_and_login(client)
    r = client.post("/demo/template/refresh", headers=auth_headers(user["token"]))
    assert r.status_code == 403


def test_template_refresh_as_admin(client, db_session, refreshed_template):
    admin, result = refreshed_template
    counts = result["counts"]

    assert counts["workouts"] == 3
    assert counts["templates"] == 1
    assert counts["cardio_sessions"] == 1
    assert "measurements" not in counts  # body-measurement data is never copied

    template_user = db_session.query(User).filter(User.id == result["template_user_id"]).first()
    assert template_user is not None
    assert template_user.demo_role == "template"
    assert template_user.is_admin is False
    assert not template_user.password_hash.startswith("$2")  # never a real bcrypt hash


# 3. Demo start after refresh: sandbox looks like a real, isolated account -

def test_demo_start_after_refresh(client, refreshed_template):
    admin, _result = refreshed_template

    r = client.post("/demo/start")
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert token

    me = client.get("/auth/me", headers=auth_headers(token))
    assert me.status_code == 200
    body = me.json()
    assert body["is_demo"] is True
    assert body["is_admin"] is False
    assert body["username"].startswith("demo_")

    workouts = client.get("/workouts", headers=auth_headers(token))
    assert workouts.status_code == 200
    assert len(workouts.json()) == len(admin["workouts"])

    templates = client.get("/templates", headers=auth_headers(token))
    assert templates.status_code == 200
    assert len(templates.json()) == 1

    prs = client.get("/stats/prs", headers=auth_headers(token))
    assert prs.status_code == 200
    assert len(prs.json()) > 0


# 4. Clone correctness: FK integrity + note stripping ----------------------

def test_clone_correctness(client, db_session, refreshed_template):
    admin, result = refreshed_template
    template_id = result["template_user_id"]

    sandbox, _counts = demo_service.provision_sandbox(db_session)
    sandbox_id = sandbox.id

    source_workout_ids = {w["id"] for w in admin["workouts"]}
    template_workout_ids = {
        w.id for w in db_session.query(Workout).filter(Workout.user_id == template_id).all()
    }
    foreign_workout_ids = source_workout_ids | template_workout_ids

    sandbox_workouts = db_session.query(Workout).filter(Workout.user_id == sandbox_id).all()
    sandbox_workout_ids = {w.id for w in sandbox_workouts}
    assert len(sandbox_workout_ids) == 3
    assert sandbox_workout_ids.isdisjoint(foreign_workout_ids)

    sandbox_exercises = (
        db_session.query(Exercise).join(Workout, Exercise.workout_id == Workout.id)
        .filter(Workout.user_id == sandbox_id).all()
    )
    assert len(sandbox_exercises) > 0
    for e in sandbox_exercises:
        assert e.workout_id in sandbox_workout_ids
    sandbox_exercise_ids = {e.id for e in sandbox_exercises}

    sandbox_sets = (
        db_session.query(Set).join(Exercise, Set.exercise_id == Exercise.id)
        .filter(Exercise.id.in_(sandbox_exercise_ids)).all()
    )
    assert len(sandbox_sets) > 0
    for s in sandbox_sets:
        assert s.exercise_id in sandbox_exercise_ids

    # Templates -> TemplateExercises -> TemplateSets
    from api.models import WorkoutTemplate  # local import to keep top imports lean
    sandbox_template_rows = db_session.query(WorkoutTemplate).filter(WorkoutTemplate.user_id == sandbox_id).all()
    assert len(sandbox_template_rows) == 1
    sandbox_template_ids = {t.id for t in sandbox_template_rows}

    sandbox_tex = (
        db_session.query(TemplateExercise)
        .filter(TemplateExercise.template_id.in_(sandbox_template_ids)).all()
    )
    assert len(sandbox_tex) > 0
    sandbox_tex_ids = {e.id for e in sandbox_tex}
    for e in sandbox_tex:
        assert e.template_id in sandbox_template_ids

    sandbox_tsets = db_session.query(TemplateSet).filter(TemplateSet.exercise_id.in_(sandbox_tex_ids)).all()
    assert len(sandbox_tsets) > 0
    for s in sandbox_tsets:
        assert s.exercise_id in sandbox_tex_ids

    # Cardio -> segments, and notes stripped
    sandbox_cardio = db_session.query(CardioSession).filter(CardioSession.user_id == sandbox_id).all()
    assert len(sandbox_cardio) == 1
    assert sandbox_cardio[0].notes is None  # source had "felt great today"
    sandbox_cardio_ids = {c.id for c in sandbox_cardio}

    sandbox_segments = db_session.query(CardioSegment).filter(CardioSegment.session_id.in_(sandbox_cardio_ids)).all()
    assert len(sandbox_segments) == 2
    for seg in sandbox_segments:
        assert seg.session_id in sandbox_cardio_ids
        assert seg.notes is None  # source warmup segment had "easy pace, felt loose"


# 5. Source account is never mutated by demo activity ----------------------

def test_source_untouched_after_demo_mutations(client, db_session, refreshed_template):
    admin, _result = refreshed_template

    before_counts = row_counts(db_session, admin["user_id"])
    before_checksum = data_checksum(db_session, admin["user_id"])

    r = client.post("/demo/start")
    assert r.status_code == 200
    demo_token = r.json()["access_token"]

    # Demo user: create a workout, mutate a set, delete a workout, delete a template.
    seed_workout(client, demo_token, name="Demo Added Workout", day_offset=0, weight=50)

    demo_workouts = client.get("/workouts", headers=auth_headers(demo_token)).json()
    target_id = demo_workouts[0]["id"]
    full = client.get(f"/workouts/{target_id}", headers=auth_headers(demo_token)).json()
    ex = full["exercises"][0]
    set_id = ex["sets"][0]["id"]
    upd = client.put(
        f"/workouts/{target_id}/exercises/{ex['id']}/sets/{set_id}",
        json={"weight": 999},
        headers=auth_headers(demo_token),
    )
    assert upd.status_code == 200

    delete_target = demo_workouts[1]["id"]
    del_resp = client.delete(f"/workouts/{delete_target}", headers=auth_headers(demo_token))
    assert del_resp.status_code == 204

    demo_templates = client.get("/templates", headers=auth_headers(demo_token)).json()
    tid = demo_templates[0]["id"]
    del_tmpl = client.delete(f"/templates/{tid}", headers=auth_headers(demo_token))
    assert del_tmpl.status_code == 204

    after_counts = row_counts(db_session, admin["user_id"])
    after_checksum = data_checksum(db_session, admin["user_id"])
    assert after_counts == before_counts
    assert after_checksum == before_checksum


# 6. Cross-user isolation ---------------------------------------------------

def test_cross_user_isolation(client, refreshed_template):
    admin, _result = refreshed_template
    source_workout_id = admin["workouts"][0]["id"]

    r = client.post("/demo/start")
    assert r.status_code == 200
    demo_token = r.json()["access_token"]

    # Demo can't read/edit/delete a source-owned workout.
    assert client.get(f"/workouts/{source_workout_id}", headers=auth_headers(demo_token)).status_code == 404
    assert client.put(
        f"/workouts/{source_workout_id}", json={"name": "hacked"}, headers=auth_headers(demo_token)
    ).status_code == 404
    assert client.delete(f"/workouts/{source_workout_id}", headers=auth_headers(demo_token)).status_code == 404

    # Source can't see the sandbox's cloned workouts either.
    sandbox_workout_id = client.get("/workouts", headers=auth_headers(demo_token)).json()[0]["id"]
    assert client.get(f"/workouts/{sandbox_workout_id}", headers=auth_headers(admin["token"])).status_code == 404


# 7. Demo users can never authenticate normally -----------------------------

def test_demo_users_cannot_login(client, db_session, refreshed_template):
    admin, result = refreshed_template

    r = client.post("/demo/start")
    assert r.status_code == 200
    demo_token = r.json()["access_token"]
    demo_me = client.get("/auth/me", headers=auth_headers(demo_token)).json()
    sandbox_username = demo_me["username"]
    sandbox_email = demo_me["email"]

    bad_login = client.post("/auth/login", json={"username": sandbox_username, "password": "anything"})
    assert bad_login.status_code == 401

    template_login = client.post(
        "/auth/login", json={"username": demo_service.TEMPLATE_USERNAME, "password": "anything"}
    )
    assert template_login.status_code == 401

    from api.models import PasswordResetToken
    sandbox_user_id = db_session.query(User).filter(User.username == sandbox_username).first().id
    before = db_session.query(func.count(PasswordResetToken.id)).filter(
        PasswordResetToken.user_id == sandbox_user_id
    ).scalar()

    forgot = client.post("/auth/forgot-password", json={"email": sandbox_email})
    assert forgot.status_code == 200

    after = db_session.query(func.count(PasswordResetToken.id)).filter(
        PasswordResetToken.user_id == sandbox_user_id
    ).scalar()
    assert after == before == 0


# 8. A token minted for the template user id is always rejected -----------

def test_template_jwt_rejected(client, refreshed_template):
    _admin, result = refreshed_template
    template_id = result["template_user_id"]
    token = auth_module.create_access_token(template_id)
    r = client.get("/auth/me", headers=auth_headers(token))
    assert r.status_code == 401


# 9. Rate limiting on /demo/start -------------------------------------------

def test_demo_start_rate_limited(client, refreshed_template):
    from api.routers.demo import RATE_LIMIT_COUNT
    for _ in range(RATE_LIMIT_COUNT):
        r = client.post("/demo/start")
        assert r.status_code == 200
    r = client.post("/demo/start")
    assert r.status_code == 429


# 10. Cleanup: only expired sandboxes are removed ---------------------------

def test_cleanup_sandboxes(client, db_session, refreshed_template):
    admin, _result = refreshed_template

    sandbox_old, _ = demo_service.provision_sandbox(db_session)
    sandbox_fresh1, _ = demo_service.provision_sandbox(db_session)
    sandbox_fresh2, _ = demo_service.provision_sandbox(db_session)

    old_id = sandbox_old.id
    fresh_ids = {sandbox_fresh1.id, sandbox_fresh2.id}

    # Backdate the "old" sandbox past the 24h TTL.
    db_session.query(User).filter(User.id == old_id).update(
        {"created_at": datetime.utcnow() - timedelta(hours=25)}
    )
    db_session.commit()

    removed = demo_service.cleanup_sandboxes(db_session)
    assert removed == 1

    assert db_session.query(User).filter(User.id == old_id).first() is None
    assert db_session.query(Workout).filter(Workout.user_id == old_id).count() == 0

    for fid in fresh_ids:
        assert db_session.query(User).filter(User.id == fid).first() is not None

    assert db_session.query(User).filter(User.id == admin["user_id"]).first() is not None
    template_user = demo_service.get_template_user(db_session)
    assert template_user is not None

    # _delete_owned_rows refuses to touch non-demo users.
    before_workout_count = db_session.query(func.count(Workout.id)).filter(
        Workout.user_id == admin["user_id"]
    ).scalar()
    try:
        demo_service._delete_owned_rows(db_session, [admin["user_id"]])
        raised = False
    except RuntimeError:
        raised = True
    assert raised
    after_workout_count = db_session.query(func.count(Workout.id)).filter(
        Workout.user_id == admin["user_id"]
    ).scalar()
    assert after_workout_count == before_workout_count


# 11. Rollback on failure: no partial sandbox left behind -------------------

def test_rollback_on_failure(client, db_session, monkeypatch, refreshed_template):
    _admin, _result = refreshed_template

    original = demo_service._insert_returning_ids
    call_count = {"n": 0}

    def flaky(db, model, rows):
        call_count["n"] += 1
        if call_count["n"] == 2:  # 1st call = Workout, 2nd = Exercise
            raise RuntimeError("simulated failure during exercise clone")
        return original(db, model, rows)

    monkeypatch.setattr(demo_service, "_insert_returning_ids", flaky)

    before_user_count = db_session.query(func.count(User.id)).scalar()
    before_max_id = db_session.query(func.max(User.id)).scalar() or 0

    r = client.post("/demo/start")
    assert r.status_code == 500

    after_user_count = db_session.query(func.count(User.id)).scalar()
    assert after_user_count == before_user_count

    orphan_sandboxes = db_session.query(User).filter(
        User.id > before_max_id, User.demo_role == demo_service.SANDBOX_ROLE
    ).all()
    assert orphan_sandboxes == []

    all_user_ids = {uid for (uid,) in db_session.query(User.id).all()}
    orphan_workouts = [w for w in db_session.query(Workout).all() if w.user_id not in all_user_ids]
    assert orphan_workouts == []


# 12. Date shift lands the newest workout on "yesterday" --------------------

def test_date_shift_lands_on_yesterday(db_session, refreshed_template):
    _admin, result = refreshed_template
    template_id = result["template_user_id"]

    template_latest = db_session.query(func.max(Workout.date)).filter(
        Workout.user_id == template_id
    ).scalar()
    assert template_latest < date.today() - timedelta(days=1)  # sanity: shift is actually needed

    sandbox, _counts = demo_service.provision_sandbox(db_session)
    sandbox_latest = db_session.query(func.max(Workout.date)).filter(
        Workout.user_id == sandbox.id
    ).scalar()
    assert sandbox_latest == date.today() - timedelta(days=1)


# 13. sanitize_session_name -------------------------------------------------

def test_sanitize_session_name():
    assert demo_service.sanitize_session_name("Upper- New York sport club:") == "Upper"
    assert demo_service.sanitize_session_name("Legs+ shoulders- home") == "Legs + Shoulders"
