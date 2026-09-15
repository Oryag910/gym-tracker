"""Recruiter demo data flow.

    real source account  --(admin-triggered, one-time)-->  demo template user
    demo template user   --(every "Try Demo" click)------>  disposable sandbox user

The template is a sanitized, protected snapshot: no password, no login, never
issued a token. Sandboxes are full independent copies of the template, so a
recruiter can write freely without touching the template or the source account.

Cloning is done with a handful of bulk INSERT ... RETURNING statements (one per
table) and explicit old-id -> new-id maps, so children always point at the
cloned parents, never at the source rows.
"""
import logging
import re
import secrets
from datetime import date, datetime, timedelta

from sqlalchemy import delete, func, insert, select
from sqlalchemy.orm import Session

from api.models import (
    CardioSegment,
    CardioSession,
    CustomExercise,
    Exercise,
    Measurement,
    PasswordResetToken,
    Set,
    TemplateExercise,
    TemplateSet,
    User,
    Workout,
    WorkoutTemplate,
)

log = logging.getLogger(__name__)

TEMPLATE_ROLE = "template"
SANDBOX_ROLE = "sandbox"
TEMPLATE_USERNAME = "__demo_template__"
DEMO_EMAIL_DOMAIN = "demo.gymtracker.invalid"   # reserved TLD: can never receive mail

# Bcrypt hashes start with "$2"; verify_password() refuses anything else, so this
# value can never be logged in with even if someone learns it.
UNUSABLE_PASSWORD = "!demo-account-no-password"

SANDBOX_TTL = timedelta(hours=24)
MAX_ACTIVE_SANDBOXES = 200   # hard cap so a public endpoint cannot grow the DB unbounded


class DemoUnavailable(Exception):
    """Raised when no demo template exists yet."""


def sanitize_session_name(name: str | None) -> str:
    """Reduce a free-text session name to its training-split label.

    Real names often carry a location or gym after a dash or colon
    ("Upper- New York sport club:", "Legs+ shoulders- home"). Keeping only the
    part before the separator drops that personal context and also groups
    sessions into consistent types ("Upper", "Legs + Shoulders") for analytics.
    """
    base = re.split(r"[-:]", name or "", maxsplit=1)[0]
    base = re.sub(r"\s*\+\s*", " + ", base)
    base = re.sub(r"\s+", " ", base).strip()
    if not base:
        return "Workout"
    return " ".join(w if w.isupper() else w.capitalize() for w in base.split(" "))


# ---------------------------------------------------------------------------
# Cloning
# ---------------------------------------------------------------------------

def _insert_returning_ids(db: Session, model, rows: list[dict]) -> list[int]:
    """Bulk-insert rows and return the new ids in the same order as `rows`."""
    if not rows:
        return []
    result = db.execute(
        insert(model).returning(model.id, sort_by_parameter_order=True),
        rows,
    )
    return [r[0] for r in result]


def _shift(d, delta: timedelta):
    return d + delta if d is not None else None


def clone_user_data(
    db: Session,
    src_user_id: int,
    dst_user_id: int,
    *,
    date_shift: timedelta = timedelta(0),
    strip_notes: bool = True,
    sanitize_names: bool = False,
) -> dict:
    """Copy all training data owned by src -> dst. Never modifies src rows.

    Copied:   workouts/exercises/sets, templates/exercises/sets, cardio sessions/segments.
    Optional: sanitize_names reduces workout/cardio names to their split label (template only).
    Excluded: measurements (body weight / body fat / girths are private health data),
              custom exercises (unused feature), password reset tokens, credentials.
    """
    counts: dict[str, int] = {}
    clean = sanitize_session_name if sanitize_names else (lambda n: n)

    # --- Workouts -> Exercises -> Sets --------------------------------------
    src_workouts = db.execute(
        select(Workout.id, Workout.name, Workout.date, Workout.created_at)
        .where(Workout.user_id == src_user_id)
        .order_by(Workout.id)
    ).all()
    new_ids = _insert_returning_ids(db, Workout, [
        {"user_id": dst_user_id, "name": clean(w.name),
         "date": _shift(w.date, date_shift), "created_at": _shift(w.created_at, date_shift)}
        for w in src_workouts
    ])
    workout_map = {w.id: nid for w, nid in zip(src_workouts, new_ids)}
    counts["workouts"] = len(workout_map)

    src_exercises = db.execute(
        select(Exercise.id, Exercise.workout_id, Exercise.name, Exercise.order_index,
               Exercise.is_unilateral, Exercise.is_timed, Exercise.attachment)
        .join(Workout, Exercise.workout_id == Workout.id)
        .where(Workout.user_id == src_user_id)
        .order_by(Exercise.id)
    ).all()
    new_ids = _insert_returning_ids(db, Exercise, [
        {"workout_id": workout_map[e.workout_id], "name": e.name, "order_index": e.order_index,
         "is_unilateral": e.is_unilateral, "is_timed": e.is_timed, "attachment": e.attachment}
        for e in src_exercises
    ])
    exercise_map = {e.id: nid for e, nid in zip(src_exercises, new_ids)}
    counts["exercises"] = len(exercise_map)

    src_sets = db.execute(
        select(Set.exercise_id, Set.weight, Set.reps, Set.rpe, Set.set_number,
               Set.weight_right, Set.reps_right, Set.duration)
        .join(Exercise, Set.exercise_id == Exercise.id)
        .join(Workout, Exercise.workout_id == Workout.id)
        .where(Workout.user_id == src_user_id)
        .order_by(Set.id)
    ).all()
    if src_sets:
        db.execute(insert(Set), [
            {"exercise_id": exercise_map[s.exercise_id], "weight": s.weight, "reps": s.reps,
             "rpe": s.rpe, "set_number": s.set_number, "weight_right": s.weight_right,
             "reps_right": s.reps_right, "duration": s.duration}
            for s in src_sets
        ])
    counts["sets"] = len(src_sets)

    # --- Templates -> TemplateExercises -> TemplateSets ---------------------
    src_templates = db.execute(
        select(WorkoutTemplate.id, WorkoutTemplate.name, WorkoutTemplate.description,
               WorkoutTemplate.default_set_rest, WorkoutTemplate.default_exercise_rest,
               WorkoutTemplate.created_at)
        .where(WorkoutTemplate.user_id == src_user_id)
        .order_by(WorkoutTemplate.id)
    ).all()
    new_ids = _insert_returning_ids(db, WorkoutTemplate, [
        {"user_id": dst_user_id, "name": t.name, "description": t.description,
         "default_set_rest": t.default_set_rest, "default_exercise_rest": t.default_exercise_rest,
         "created_at": t.created_at}
        for t in src_templates
    ])
    template_map = {t.id: nid for t, nid in zip(src_templates, new_ids)}
    counts["templates"] = len(template_map)

    src_tex = db.execute(
        select(TemplateExercise.id, TemplateExercise.template_id, TemplateExercise.name,
               TemplateExercise.order_index, TemplateExercise.set_rest_override,
               TemplateExercise.exercise_rest_override, TemplateExercise.is_unilateral,
               TemplateExercise.attachment)
        .join(WorkoutTemplate, TemplateExercise.template_id == WorkoutTemplate.id)
        .where(WorkoutTemplate.user_id == src_user_id)
        .order_by(TemplateExercise.id)
    ).all()
    new_ids = _insert_returning_ids(db, TemplateExercise, [
        {"template_id": template_map[e.template_id], "name": e.name, "order_index": e.order_index,
         "set_rest_override": e.set_rest_override, "exercise_rest_override": e.exercise_rest_override,
         "is_unilateral": e.is_unilateral, "attachment": e.attachment}
        for e in src_tex
    ])
    tex_map = {e.id: nid for e, nid in zip(src_tex, new_ids)}
    counts["template_exercises"] = len(tex_map)

    src_tsets = db.execute(
        select(TemplateSet.exercise_id, TemplateSet.set_number,
               TemplateSet.target_weight, TemplateSet.target_reps)
        .join(TemplateExercise, TemplateSet.exercise_id == TemplateExercise.id)
        .join(WorkoutTemplate, TemplateExercise.template_id == WorkoutTemplate.id)
        .where(WorkoutTemplate.user_id == src_user_id)
        .order_by(TemplateSet.id)
    ).all()
    if src_tsets:
        db.execute(insert(TemplateSet), [
            {"exercise_id": tex_map[s.exercise_id], "set_number": s.set_number,
             "target_weight": s.target_weight, "target_reps": s.target_reps}
            for s in src_tsets
        ])
    counts["template_sets"] = len(src_tsets)

    # --- Cardio sessions -> segments ----------------------------------------
    src_cardio = db.execute(
        select(CardioSession.id, CardioSession.date, CardioSession.name, CardioSession.activity_type,
               CardioSession.total_distance, CardioSession.total_duration, CardioSession.avg_hr,
               CardioSession.max_hr, CardioSession.calories, CardioSession.temperature,
               CardioSession.notes, CardioSession.created_at)
        .where(CardioSession.user_id == src_user_id)
        .order_by(CardioSession.id)
    ).all()
    new_ids = _insert_returning_ids(db, CardioSession, [
        {"user_id": dst_user_id, "date": _shift(c.date, date_shift), "name": clean(c.name),
         "activity_type": c.activity_type, "total_distance": c.total_distance,
         "total_duration": c.total_duration, "avg_hr": c.avg_hr, "max_hr": c.max_hr,
         "calories": c.calories, "temperature": c.temperature,
         "notes": None if strip_notes else c.notes, "created_at": _shift(c.created_at, date_shift)}
        for c in src_cardio
    ])
    cardio_map = {c.id: nid for c, nid in zip(src_cardio, new_ids)}
    counts["cardio_sessions"] = len(cardio_map)

    src_segments = db.execute(
        select(CardioSegment.session_id, CardioSegment.sort_order, CardioSegment.label,
               CardioSegment.segment_type, CardioSegment.distance, CardioSegment.duration,
               CardioSegment.pace, CardioSegment.hr, CardioSegment.reps, CardioSegment.notes)
        .join(CardioSession, CardioSegment.session_id == CardioSession.id)
        .where(CardioSession.user_id == src_user_id)
        .order_by(CardioSegment.id)
    ).all()
    if src_segments:
        db.execute(insert(CardioSegment), [
            {"session_id": cardio_map[s.session_id], "sort_order": s.sort_order, "label": s.label,
             "segment_type": s.segment_type, "distance": s.distance, "duration": s.duration,
             "pace": s.pace, "hr": s.hr, "reps": s.reps, "notes": None if strip_notes else s.notes}
            for s in src_segments
        ])
    counts["cardio_segments"] = len(src_segments)

    return counts


# ---------------------------------------------------------------------------
# Deletion (demo users only)
# ---------------------------------------------------------------------------

def _delete_owned_rows(db: Session, user_ids: list[int]) -> None:
    """Delete every row owned by the given users, children first.

    Guarded: refuses to run unless every id belongs to a demo user. This is the
    only place demo code deletes anything, so the guard protects real accounts
    even if a caller passes the wrong ids.
    """
    if not user_ids:
        return
    roles = db.execute(
        select(User.id, User.demo_role).where(User.id.in_(user_ids))
    ).all()
    found = {r.id: r.demo_role for r in roles}
    bad = [uid for uid in user_ids if found.get(uid) not in (TEMPLATE_ROLE, SANDBOX_ROLE)]
    if bad:
        raise RuntimeError(f"refusing to delete data for non-demo users: {bad}")

    workout_ids = select(Workout.id).where(Workout.user_id.in_(user_ids))
    exercise_ids = select(Exercise.id).where(Exercise.workout_id.in_(workout_ids))
    db.execute(delete(Set).where(Set.exercise_id.in_(exercise_ids)))
    db.execute(delete(Exercise).where(Exercise.workout_id.in_(workout_ids)))
    db.execute(delete(Workout).where(Workout.user_id.in_(user_ids)))

    template_ids = select(WorkoutTemplate.id).where(WorkoutTemplate.user_id.in_(user_ids))
    tex_ids = select(TemplateExercise.id).where(TemplateExercise.template_id.in_(template_ids))
    db.execute(delete(TemplateSet).where(TemplateSet.exercise_id.in_(tex_ids)))
    db.execute(delete(TemplateExercise).where(TemplateExercise.template_id.in_(template_ids)))
    db.execute(delete(WorkoutTemplate).where(WorkoutTemplate.user_id.in_(user_ids)))

    cardio_ids = select(CardioSession.id).where(CardioSession.user_id.in_(user_ids))
    db.execute(delete(CardioSegment).where(CardioSegment.session_id.in_(cardio_ids)))
    db.execute(delete(CardioSession).where(CardioSession.user_id.in_(user_ids)))

    db.execute(delete(Measurement).where(Measurement.user_id.in_(user_ids)))
    db.execute(delete(CustomExercise).where(CustomExercise.user_id.in_(user_ids)))
    db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id.in_(user_ids)))


# ---------------------------------------------------------------------------
# Template
# ---------------------------------------------------------------------------

def get_template_user(db: Session) -> User | None:
    return db.query(User).filter(User.demo_role == TEMPLATE_ROLE).first()


def refresh_template(db: Session, source: User) -> dict:
    """(Re)build the demo template from `source`. Commits on success.

    The source user is only ever read. The returned report lists every
    free-text value that was copied so the owner can review it for privacy.
    """
    if source.demo_role is not None:
        raise ValueError("source must be a real account, not a demo user")

    template = get_template_user(db)
    if template is None:
        template = User(
            username=TEMPLATE_USERNAME,
            email=f"template@{DEMO_EMAIL_DOMAIN}",
            password_hash=UNUSABLE_PASSWORD,
            is_admin=False,
            demo_role=TEMPLATE_ROLE,
        )
        db.add(template)
        db.flush()
    else:
        template.is_admin = False
        _delete_owned_rows(db, [template.id])

    # Unit preferences are display settings, not personal data; keep the demo
    # looking the way the source account does.
    for attr in ("unit_system", "pref_weight", "pref_body_weight",
                 "pref_distance", "pref_measure", "pref_temp"):
        setattr(template, attr, getattr(source, attr))

    counts = clone_user_data(db, source.id, template.id, strip_notes=True, sanitize_names=True)
    db.commit()

    workout_names = [r[0] for r in db.execute(
        select(Workout.name).where(Workout.user_id == template.id).distinct().order_by(Workout.name)
    )]
    template_text = [
        {"name": r.name, "description": r.description}
        for r in db.execute(select(WorkoutTemplate.name, WorkoutTemplate.description)
                            .where(WorkoutTemplate.user_id == template.id))
    ]
    cardio_names = [r[0] for r in db.execute(
        select(CardioSession.name).where(CardioSession.user_id == template.id).distinct()
    )]
    date_range = db.execute(
        select(func.min(Workout.date), func.max(Workout.date)).where(Workout.user_id == template.id)
    ).one()

    return {
        "template_user_id": template.id,
        "counts": counts,
        "workout_date_range": [str(date_range[0]), str(date_range[1])],
        "review_free_text": {
            "workout_names": workout_names,
            "templates": template_text,
            "cardio_names": cardio_names,
        },
    }


# ---------------------------------------------------------------------------
# Sandboxes
# ---------------------------------------------------------------------------

def _date_shift_for(db: Session, template_id: int) -> timedelta:
    """Shift history so the most recent workout lands on yesterday.

    A uniform shift keeps every interval, trend, and PR order intact while
    making the dashboard ("this week", recent workouts) look live.
    """
    latest = db.execute(
        select(func.max(Workout.date)).where(Workout.user_id == template_id)
    ).scalar()
    if latest is None:
        return timedelta(0)
    if isinstance(latest, str):          # SQLite returns ISO strings from func.max
        latest = date.fromisoformat(latest)
    target = date.today() - timedelta(days=1)
    return max(target - latest, timedelta(0))


def provision_sandbox(db: Session) -> tuple[User, dict]:
    """Create a fresh sandbox user cloned from the template. Commits on success.

    Everything runs inside the session's single transaction, so a failure
    anywhere leaves no partially populated user behind.
    """
    template = get_template_user(db)
    if template is None:
        raise DemoUnavailable("demo template has not been created")

    name = f"demo_{secrets.token_hex(6)}"
    sandbox = User(
        username=name,
        email=f"{name}@{DEMO_EMAIL_DOMAIN}",
        password_hash=UNUSABLE_PASSWORD,
        is_admin=False,
        demo_role=SANDBOX_ROLE,
        unit_system=template.unit_system,
        pref_weight=template.pref_weight,
        pref_body_weight=template.pref_body_weight,
        pref_distance=template.pref_distance,
        pref_measure=template.pref_measure,
        pref_temp=template.pref_temp,
    )
    db.add(sandbox)
    db.flush()

    counts = clone_user_data(
        db, template.id, sandbox.id,
        date_shift=_date_shift_for(db, template.id),
        strip_notes=True,
    )
    db.commit()
    db.refresh(sandbox)
    return sandbox, counts


def cleanup_sandboxes(db: Session, now: datetime | None = None) -> int:
    """Delete expired sandboxes, plus the oldest ones beyond the active cap.

    Only rows with demo_role='sandbox' are ever selected; real users and the
    template are untouchable here by construction.
    """
    now = now or datetime.utcnow()
    expired = db.execute(
        select(User.id).where(User.demo_role == SANDBOX_ROLE, User.created_at < now - SANDBOX_TTL)
    ).scalars().all()

    overflow: list[int] = []
    active = db.execute(
        select(User.id).where(User.demo_role == SANDBOX_ROLE).order_by(User.created_at.desc())
    ).scalars().all()
    if len(active) > MAX_ACTIVE_SANDBOXES:
        overflow = active[MAX_ACTIVE_SANDBOXES:]

    victims = sorted(set(expired) | set(overflow))
    if not victims:
        return 0

    _delete_owned_rows(db, victims)
    db.execute(delete(User).where(User.id.in_(victims), User.demo_role == SANDBOX_ROLE))
    db.commit()
    log.info("demo cleanup: removed %d sandbox users", len(victims))
    return len(victims)


def demo_status(db: Session) -> dict:
    template = get_template_user(db)
    sandbox_count = db.execute(
        select(func.count(User.id)).where(User.demo_role == SANDBOX_ROLE)
    ).scalar()
    return {
        "template_exists": template is not None,
        "template_workouts": (
            db.execute(select(func.count(Workout.id)).where(Workout.user_id == template.id)).scalar()
            if template else 0
        ),
        "active_sandboxes": sandbox_count,
        "sandbox_ttl_hours": SANDBOX_TTL.total_seconds() / 3600,
    }
