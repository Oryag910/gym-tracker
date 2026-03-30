"""
Step 3: Import approved workouts_parsed.json into the app via the API.

Usage:
    # Dry run first (prints what would be imported — no API calls)
    python scripts/import_workouts.py --token YOUR_TOKEN --api https://your-app.up.railway.app --dry-run

    # Real import
    python scripts/import_workouts.py --token YOUR_TOKEN --api https://your-app.up.railway.app

Getting your token:
    1. Open your app in the browser and log in
    2. Open DevTools (F12 or right-click → Inspect)
    3. Go to Application tab → Local Storage → your app's URL
    4. Copy the value of the "token" key

Prerequisites:
    - workouts_parsed.json exists and unit fields have been reviewed
    - exercise_mapping.json exists and has no __REVIEW__ entries
"""

import json
import argparse
import urllib.request
import urllib.error
from pathlib import Path

SCRIPTS_DIR  = Path(__file__).parent
PARSED_FILE  = SCRIPTS_DIR / "workouts_parsed.json"
MAPPING_FILE = SCRIPTS_DIR / "exercise_mapping.json"

KG_TO_LBS = 2.20462  # all weights stored as lbs in the database

def post_workout(api_base: str, token: str, payload: dict) -> dict:
    """POST /workouts and return the response dict."""
    import ssl
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    url  = f"{api_base.rstrip('/')}/workouts"
    body = json.dumps(payload).encode("utf-8")
    req  = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type":  "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
        return json.loads(resp.read())

def main():
    parser = argparse.ArgumentParser(description="Import parsed workouts via the app API")
    parser.add_argument("--token",   required=True, help="Your JWT auth token")
    parser.add_argument("--api",     required=True, help="Base URL of your API")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print what would be imported without making any API calls")
    args = parser.parse_args()

    # ── Load files ────────────────────────────────────────────────────────────
    if not PARSED_FILE.exists():
        print(f"✗ {PARSED_FILE} not found. Run parse_workouts.py first.")
        return
    if not MAPPING_FILE.exists():
        print(f"✗ {MAPPING_FILE} not found. Run parse_workouts.py first.")
        return

    workouts = json.loads(PARSED_FILE.read_text(encoding="utf-8"))
    mapping  = json.loads(MAPPING_FILE.read_text(encoding="utf-8"))

    # ── Pre-flight: check for unresolved __REVIEW__ entries ───────────────────
    review_entries = [k for k, v in mapping.items() if v == "__REVIEW__"]
    if review_entries:
        print("✗ exercise_mapping.json still has __REVIEW__ entries:")
        for name in review_entries:
            print(f"    \"{name}\": \"__REVIEW__\"")
        print("\nFix these before importing (set the correct canonical name or \"__SKIP__\").")
        return

    # ── Import loop ───────────────────────────────────────────────────────────
    imported = skipped = failed = 0
    skip_reason_counts: dict[str, int] = {}

    for w in workouts:
        unit = w.get("unit", "lbs")  # "lbs" or "kg"

        # Build exercises list, applying name mapping
        exercises = []
        for ex in w["exercises"]:
            canonical = mapping.get(ex["raw_name"])
            if canonical == "__SKIP__" or canonical is None:
                skip_reason_counts[ex["raw_name"]] = skip_reason_counts.get(ex["raw_name"], 0) + 1
                continue

            # Convert weights to lbs if they were recorded in kg
            sets = []
            for s in ex["sets"]:
                weight_lbs = round(s["weight"] * KG_TO_LBS, 2) if unit == "kg" else s["weight"]
                sets.append({
                    "weight": weight_lbs,
                    "reps":   s["reps"],
                    "rpe":    None,
                })
            exercises.append({"name": canonical, "sets": sets})

        if not exercises:
            # All exercises were skipped for this workout
            skipped += 1
            continue

        payload = {
            "name":      w.get("name", "Workout"),
            "date":      w["date"],
            "exercises": exercises,
        }

        label = f"{w['date']}  {w.get('name', '')}  ({len(exercises)} exercises)"

        if args.dry_run:
            print(f"  [DRY RUN] Would import: {label}")
            for ex in exercises:
                set_summary = "  +  ".join(f"{s['reps']}×{s['weight']}lbs" for s in ex["sets"])
                print(f"              {ex['name']}: {set_summary}")
            imported += 1
            continue

        # Real import
        try:
            post_workout(args.api, args.token, payload)
            print(f"  ✓ {label}")
            imported += 1
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            print(f"  ✗ FAILED ({e.code}): {label}")
            print(f"    {body[:200]}")
            failed += 1
        except Exception as e:
            print(f"  ✗ FAILED: {label}")
            print(f"    {e}")
            failed += 1

    # ── Summary ───────────────────────────────────────────────────────────────
    print()
    if args.dry_run:
        print(f"DRY RUN complete. Would import {imported} workouts.")
    else:
        print(f"Done.  Imported: {imported}  |  Failed: {failed}  |  Fully-skipped: {skipped}")

    if skip_reason_counts:
        print(f"\nSkipped exercises (mapped to __SKIP__ or missing from mapping):")
        for name, count in sorted(skip_reason_counts.items(), key=lambda x: -x[1]):
            print(f"    {count:3d}×  {name}")

if __name__ == "__main__":
    main()
