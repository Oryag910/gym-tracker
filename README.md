# GymTrackerCLI

Full-stack fitness tracker: strength workouts, cardio, body measurements, PR trends, workout templates, and guided set-by-set walkthroughs with rest timers.

**Live demo:** https://gym-tracker-lemon-five.vercel.app

Click **Try Demo** — no account or credentials needed.

## Live demo

The demo runs against a real Postgres dataset (~300 workouts, ~2,000 exercises, ~6,400 sets, spanning 2024–2026, plus workout templates and cardio sessions). Backend on Railway (FastAPI + PostgreSQL), frontend on Vercel.

60-second walkthrough:
1. Click **Try Demo**
2. Land on the Dashboard — summary stats + recent workouts
3. Open Workouts — paginated list
4. Open a workout — view exercises and sets
5. Open Analytics — volume + trend charts
6. Open PRs — all-time PR per exercise
7. Open Templates
8. Start a guided workout from a template
9. Note the prefilled weight/reps (from prior performance, not just the template target)
10. Log a set
11. Navigate away mid-workout
12. Return via the Resume card
13. Refresh the page — the workout resumes from where it left off

## Features

- Strength workout logging: nested exercises and sets, unilateral (left/right) and timed (duration) exercise types
- Guided set-by-set walkthroughs with rest timers, driven by workout templates
- Cardio session logging with structured segments (distance, duration, pace, HR, reps)
- Body measurement tracking
- PR trends and running max history per exercise
- Volume and trend analytics, side-by-side workout comparison
- Workout templates with per-set targets and rest overrides
- Per-dimension unit preferences (weight, distance, body measurements, temperature)
- Admin-curated global exercise library with wger.de / ExerciseDB lookups
- Self-contained recruiter demo mode (see below)

## Architecture

| Layer | Tools |
|-------|-------|
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic 2, python-jose (JWT HS256, 7-day), bcrypt, httpx, Uvicorn |
| Database | SQLite (dev) → PostgreSQL (Railway prod) |
| Frontend | React 19, TypeScript 5.9, Vite 8, Tailwind CSS v4, React Router v7, Axios, Framer Motion, Recharts |
| Deploy | Railway (backend + Postgres), Vercel (frontend SPA), Resend (email, optional) |

The backend is a conventional FastAPI app: routers handle HTTP concerns only and delegate to a `services/` layer for business logic, with SQLAlchemy models shared across both. The frontend is a single-page React app behind JWT auth, with typed Axios wrappers per resource and a shared `AuthContext` for session and unit-preference state. There is no separate job queue or cache layer — periodic work (like demo sandbox cleanup) rides in as a FastAPI background task on the next relevant request.

## Data model

```
User
├── Workout (name, date)
│   └── Exercise (name, order_index, is_unilateral, is_timed, attachment)
│       └── Set (weight, reps, rpe, set_number,
│               weight_right, reps_right,  ← unilateral only
│               duration)                  ← timed only
├── Measurement (weight, body_fat, chest, waist, hips, arms, thighs, neck — nullable)
├── CardioSession → CardioSegment[] (sort_order, type, distance, duration, pace, hr, reps)
└── WorkoutTemplate → TemplateExercise[] → TemplateSet[]
    WorkoutTemplate has: default_set_rest, default_exercise_rest
    TemplateExercise has: set_rest_override, exercise_rest_override, is_unilateral, attachment
```

Exercise types: Normal (weight + reps), Unilateral (weight_right/reps_right tracked separately per side), Timed (duration in seconds, no weight/reps).

Shared/support tables: `GlobalExercise` (admin-curated library, shared across users), `ExerciseCache` (30-day TTL cache of wger.de lookups), `PasswordResetToken` (SHA-256 hashed, one-time use).

## Guided workout state machine

`GuidedWorkoutPage` is a discriminated union driven by a single `setPhase(...)`:

```
loading → ready → active ⇄ resting → summary → saving
```

- `active` holds the current exercise/set index, accumulated `completedSets`, and the in-progress input fields (weight, reps, RPE, and right-side variants for unilateral exercises)
- `resting` runs the rest timer between sets or exercises, then hands control back to `active` at the next position
- `summary` is reached once every set is logged, before the workout is POSTed
- A resume card on `/log` and on a template's guided page offers to continue an in-progress draft found in `localStorage`

## Previous-performance prefill and persistence

Each set's starting weight/reps prefers the user's own last logged performance for that exercise name over the template's target — the target is only a fallback when no prior performance exists.

The in-progress draft is written to `localStorage` on every state change, on navigation away, and on `beforeunload`, so a hard refresh or an accidental tab close doesn't lose progress. The draft is cleared only on an intentional action (saving and navigating away, or explicit "Discard") to avoid a stale draft overwriting a completed session.

## Analytics and PRs

- `pr_service.py` computes all-time PRs (max weight) per exercise in a single query with a subquery join, and running max history over time per exercise — written to avoid the PostgreSQL `GROUP BY` strictness that SQLite tolerates but Postgres rejects, and to replace a per-exercise N+1 query pattern.
- `stats_service.py` computes total volume (weight × reps) per session and per-session trends (max weight + volume) using SQL `SUM`/aggregate queries rather than pulling every set into Python.

## Historical data import pipeline

A one-time, three-step offline pipeline (`scripts/`) used to backfill the account's real training history from raw text notes:

1. `parse_workouts.py` — parses `workouts_raw.txt` into `workouts_parsed.json` (for manual unit review) and fuzzy-matches raw exercise names against the `GlobalExercise` library into `exercise_mapping.json` (for manual correction)
2. Manual review of both JSON files
3. `import_workouts.py` — POSTs the approved, mapped workouts to the API (`--dry-run` supported before a real import)

Not part of the running app; kept for reference and any future re-imports.

## Demo architecture

The owner's real account is snapshotted once, server-side, into a protected, read-only "demo template" user via an admin-only endpoint — the snapshot always sources from the caller's own account, so no user id is ever accepted from a client. Sanitization on snapshot: no credentials or password-reset tokens, no body measurements, no free-text notes, workout names reduced to their training-split label, neutral identity.

Every "Try Demo" click clones the template into a disposable sandbox user: a bulk `INSERT ... RETURNING` per table with explicit old-id → new-id maps, inside one transaction, rolled back on any failure. A normal 24-hour JWT is issued for the new sandbox. Expired sandboxes are deleted on the next provisioning call, and deletion is guarded to `demo_role='sandbox'` rows only — it can never touch a real account or the template. Sandbox dates are shifted uniformly so the most recent workout lands on yesterday, keeping the dashboard's "recent" views looking live. Provisioning measured ~50 ms on SQLite locally, sub-second on Postgres. Demo users cannot log in with a password or reset one.

## Tech stack

See the Architecture table above. Full breakdown in [claude.md](claude.md).

## Deployment

```bash
cd frontend && npm run build   # outputs frontend/dist/
```

| Variable | Where | Description |
|----------|-------|-------------|
| `DATABASE_URL` | Railway | PostgreSQL URL (`postgres://` auto-converted) |
| `SECRET_KEY` | Railway | JWT signing key |
| `ADMIN_USERNAME` | Railway | Username granted `is_admin` |
| `ALLOWED_ORIGINS` | Railway | Comma-separated CORS origins |
| `FRONTEND_URL` | Railway | Base URL for password reset emails |
| `RESEND_API_KEY` | Railway | Email API key (optional; silent if unset) |
| `FROM_EMAIL` | Railway | Sender address |
| `RAPIDAPI_KEY` | Railway | ExerciseDB API key (admin search endpoint) |
| `VITE_API_URL` | Vercel | Backend URL (unset = use Vite dev proxy) |

## Local setup

```bash
# Backend
pip install -r requirements.txt
uvicorn api.main:app --reload        # localhost:8000

# Frontend
cd frontend && npm install
npm run dev                           # localhost:5173
npm run build                         # tsc + vite build
npm run lint

# Tests
python -m pytest tests -q
```

Tests cover the demo feature end to end (14 tests): sandbox provisioning, id remapping across cloned tables, source-account isolation, cross-user access, login blocked for demo users, the per-IP rate limit, guarded cleanup (real accounts untouchable), and transaction rollback on failure.

Vite proxies `/auth`, `/workouts`, `/stats`, `/exercises`, `/library`, `/measurements`, `/cardio`, `/health` to `:8000` in dev. `/templates` is not proxied by default.

To refresh the demo template from your own account (admin only):

```bash
python scripts/refresh_demo_template.py --api <API_URL> --token <ADMIN_JWT>
```
