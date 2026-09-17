# GymTracker

A full-stack strength and cardio training tracker with historical analytics, workout templates, and resumable guided workouts. Built to replace two years of plain-text gym notes with something that shows progress.

## Live demo

**https://gym-tracker-lemon-five.vercel.app** → **Try the demo**. No sign-up.

Every visitor gets a private sandbox cloned from a real two-year training history: 308 workouts, 2,030 exercises, 6,568 sets, and 2 workout templates. Changes are yours alone and expire after 24 hours.

Suggested 60-second walkthrough:

1. **Dashboard** – lifetime totals and recent sessions
2. **Workouts** – full history grouped by month; open any session to see its sets
3. **PRs** – all-time max per exercise, tap one for its progression chart
4. **Templates** – pick one and **Start workout**
5. **Guided workout** – each set is pre-filled from your last performance ("Last time" vs "Target"); log a set and the rest timer starts
6. Navigate away, then come back via **Log Workout → Resume**, or hard-refresh the page. The session picks up exactly where it stopped.
7. **Exit demo** from the top-right

## Features

- Strength logging with nested exercises and sets, including unilateral (left/right) and timed exercises
- Guided set-by-set workouts driven by templates, with rest timers and history-based prefill
- In-progress workouts persist to `localStorage` and resume after navigation or refresh
- All-time PRs and running-max progression per exercise
- Volume, exercise-trend, body-measurement, and cardio analytics; side-by-side workout comparison
- Workout templates with per-set targets and per-exercise rest overrides
- Cardio sessions with structured segments (distance, duration, pace, heart rate)
- Per-dimension unit preferences (lbs/kg, km/mi, cm/in, °C/°F)
- Per-visitor recruiter demo sandboxes (see below)

## Architecture

```
React 19 + TypeScript (Vite)  ──HTTPS/JSON──▶  FastAPI  ──SQLAlchemy 2.0──▶  PostgreSQL
        Vercel                                  Railway                       Railway
```

- **Backend:** FastAPI routers handle HTTP only and delegate to a `services/` layer. JWT (HS256) auth, bcrypt passwords, Pydantic 2 schemas. SQLite for local dev, PostgreSQL in production. Schema changes are applied at startup by `create_all` plus a small list of idempotent `ALTER TABLE` migrations.
- **Frontend:** single-page app behind a `ProtectedRoute`, typed Axios wrappers per resource, a shared `AuthContext` for session and unit preferences, Tailwind v4 with a small set of shared style tokens, Recharts for charts.
- **Deploy:** push to `main` deploys the API to Railway and the SPA to Vercel.

## Data model

```
User
├── Workout (name, date)
│   └── Exercise (name, order_index, is_unilateral, is_timed, attachment)
│       └── Set (set_number, weight, reps, rpe,
│               weight_right, reps_right,   ← unilateral only
│               duration)                   ← timed only
├── WorkoutTemplate (default_set_rest, default_exercise_rest)
│   └── TemplateExercise (order, rest overrides, is_unilateral)
│       └── TemplateSet (target_weight, target_reps)
├── CardioSession → CardioSegment[] (type, distance, duration, pace, hr)
└── Measurement (weight, body_fat, chest, waist, hips, arms, thighs, neck)
```

Shared tables: `GlobalExercise` (curated exercise library), `ExerciseCache` (30-day cache of wger.de muscle lookups), `PasswordResetToken` (hashed, single-use).

## Guided workout

`GuidedWorkoutPage` is a state machine over a discriminated union, with every transition going through one `setPhase` call:

```
loading → ready → active ⇄ resting → summary → saving
```

- **Previous performance:** before the session starts, one request fetches the last logged weight and reps for every exercise in the template. Each set's inputs are pre-filled from that, falling back to the template target only when there is no history. The UI shows both values so the user can see why the number is what it is.
- **Persistence:** the draft is written to `localStorage` on every phase change, on route change, and on `beforeunload`. It is cleared only by an explicit action (save or discard), so a stale draft can never overwrite a finished session.
- **Resume:** a resume card appears on the log page and on the template's start screen whenever a draft exists; the rest timer is not resumable, so a draft saved mid-rest restores to the next set instead.

## Recruiter demo architecture

```
owner's real account  ──snapshot (admin only)──▶  sanitized template user  ──clone per visitor──▶  sandbox user (24 h)
```

- The template is built server-side from the caller's own account, never from a client-supplied id. Sanitization drops credentials, reset tokens, body measurements, and free-text notes, and reduces session names to their training-split label.
- Each "Try the demo" clones the template inside a single transaction: one bulk `INSERT … RETURNING` per table, with explicit old-id → new-id maps to rewrite every foreign key. Any failure rolls the whole clone back.
- Sandbox dates are shifted so the most recent workout is always "yesterday". Sandboxes get a normal 24-hour JWT, cannot log in with a password, and are deleted on the next provisioning call once expired. Cleanup is restricted to `demo_role = 'sandbox'` rows, so it can never touch a real account or the template.

## Engineering highlights

- ~8,600 relational rows cloned per demo visitor in ~0.65 s on Railway PostgreSQL, with full foreign-key remapping and transactional rollback
- PRs computed in a single query with a subquery join (replacing a per-exercise N+1 pattern), written to satisfy PostgreSQL's strict `GROUP BY` rules that SQLite silently tolerates
- Dashboard and volume analytics aggregate in SQL rather than pulling every set into Python; the dashboard endpoint replaced two full-table fetches
- Guided workout state persists through navigation and hard refresh with no server round-trip
- Analytics and PR trends run over 300+ real sessions, not seeded fixtures

## Tech stack

| Layer | Tools |
|-------|-------|
| Backend | Python 3, FastAPI, SQLAlchemy 2.0, Pydantic 2, python-jose (JWT), bcrypt, httpx, Uvicorn |
| Database | PostgreSQL (production), SQLite (development) |
| Frontend | React 19, TypeScript 5.9, Vite 8, Tailwind CSS v4, React Router v7, Axios, Framer Motion, Recharts |
| Infrastructure | Railway (API + Postgres), Vercel (SPA), Resend (transactional email, optional) |

## Running locally

```bash
# Backend (http://localhost:8000) — uses ./data/gym.db by default
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --reload

# Frontend (http://localhost:5173) — proxies API paths to :8000
cd frontend
npm install
npm run dev
```

Environment variables (all optional in development):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLAlchemy URL; `postgres://` is rewritten to `postgresql://` |
| `SECRET_KEY` | JWT signing key |
| `ADMIN_USERNAME` | Account granted admin rights at startup |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `FRONTEND_URL`, `RESEND_API_KEY`, `FROM_EMAIL` | Password-reset email (silent if unset) |
| `VITE_API_URL` | Frontend build-time API base URL (unset = Vite dev proxy) |

To build a demo template from your own admin account: `python scripts/refresh_demo_template.py --api <API_URL> --token <ADMIN_JWT>`.

The `scripts/` directory also holds the one-off pipeline that imported the original plain-text training notes (`parse_workouts.py` → manual review → `import_workouts.py --dry-run`) and the exercise-library seeder.

## Tests

```bash
python -m pytest tests -q
```

14 tests cover the demo feature end to end: sandbox provisioning, id remapping across every cloned table, source-account isolation, cross-user access, login blocked for demo users, per-IP rate limiting, guarded cleanup, and rollback on failure.

```bash
cd frontend && npm run build   # type-check + production build
```

## License

MIT
