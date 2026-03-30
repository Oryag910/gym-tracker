"""
Step 1: Parse raw workout notes → workouts_parsed.json + exercise_mapping.json

Usage:
    python scripts/parse_workouts.py --api https://your-app.up.railway.app
    python scripts/parse_workouts.py --api http://localhost:8000   # local dev

What this does:
  1. Reads scripts/workouts_raw.txt
  2. Parses every workout block (date, name, gym, exercises, sets)
  3. Writes scripts/workouts_parsed.json  ← review & set "unit" fields here
  4. Fetches your GlobalExercise library from the API
  5. Fuzzy-matches every raw exercise name to a canonical name
  6. Writes scripts/exercise_mapping.json  ← review & fix mappings here
  7. Writes scripts/exercise_names.txt     ← plain list of all raw names found
"""

import re
import json
import difflib
import argparse
from datetime import datetime
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPTS_DIR = Path(__file__).parent
RAW_FILE     = SCRIPTS_DIR / "workouts_raw.txt"
PARSED_FILE  = SCRIPTS_DIR / "workouts_parsed.json"
MAPPING_FILE = SCRIPTS_DIR / "exercise_mapping.json"
NAMES_FILE   = SCRIPTS_DIR / "exercise_names.txt"

# ── Date parsing ─────────────────────────────────────────────────────────────
# Matches: D/M/YYYY, DD/MM/YYYY, D/M/YY, DD/MM/YY, D/M, DD/MM, etc.
DATE_LINE_RE = re.compile(
    r"^(\d{1,2})[/\-\.](\d{1,2})(?:[/\-\.](\d{2,4}))?[:\s]*$"
)

def parse_date(day: str, month: str, year_str: str | None, last_year: int) -> tuple[str, int]:
    """
    Returns (iso_date_string, resolved_year).
    If year_str is None or empty, inherits last_year.
    Handles 2-digit years (e.g. 23 → 2023).
    """
    d, m = int(day), int(month)
    if year_str:
        y = int(year_str)
        if y < 100:  # 2-digit year → assume 2000s
            y += 2000
    else:
        y = last_year  # inherit from most recent entry above
    return f"{y:04d}-{m:02d}-{d:02d}", y

# ── Set parsing ───────────────────────────────────────────────────────────────
# Four formats used in the raw notes:
#
#   "reps*weight"          e.g. "8*70"       → 1 set:  8 reps at 70
#   "sets*reps-weight"     e.g. "2*8-240"    → 2 sets: 8 reps at 240 each
#   "r1,r2,r3-weight"      e.g. "9,8,7-100"  → 3 sets at 100: 9 reps, 8 reps, 7 reps
#   "reps*Nth" (ordinal)   e.g. "8*3rd"      → machine hole position, no real weight → skip
#
# Priority: ordinal check → comma-dash → expand-dash → simple
# (We must check ordinal/expand before simple to avoid "2*8" eating "2*8-240")

SET_RE_ORDINAL = re.compile(r"\d+\s*(?:st|nd|rd|th)\b", re.IGNORECASE)
SET_RE_COMMA   = re.compile(r"(\d+(?:,\d+)+)\s*-\s*([\d.]+)")      # r1,r2,...-weight
SET_RE_EXPAND  = re.compile(r"(\d+)\s*\*\s*(\d+)\s*-\s*([\d.]+)")  # sets*reps-weight
SET_RE_SIMPLE  = re.compile(r"(\d+)\s*\*\s*([\d.]+)")               # reps*weight

def parse_sets(raw: str) -> list[dict]:
    """Parse set notation into a list of set dicts.

    Handles four formats (checked in this order):
    - Ordinal hole position ("8*3rd", "2*6-5th") → skipped entirely (no real weight)
    - Comma-rep format ("9,8,7-100") → 3 sets at 100 with 9, 8, 7 reps respectively
    - Expand format ("2*8-240") → 2 identical sets of 8 reps at 240
    - Simple format ("8*70") → 1 set of 8 reps at 70
    """
    sets = []
    for part in raw.split("+"):
        part = part.strip()

        # Skip ordinal hole positions — e.g. "8*3rd", "2*6-5th"
        # These are machine adjustment holes, not real weights.
        if SET_RE_ORDINAL.search(part):
            continue

        # "r1,r2,r3-weight": different reps each set, same weight
        # e.g. "9,8,7-100" → [{reps:9,weight:100},{reps:8,weight:100},{reps:7,weight:100}]
        m = SET_RE_COMMA.search(part)
        if m:
            reps_list = [int(r) for r in m.group(1).split(",")]
            weight = float(m.group(2))
            for r in reps_list:
                sets.append({"reps": r, "weight": weight})
            continue

        # "sets*reps-weight": N identical sets
        # e.g. "2*8-240" → [{reps:8,weight:240},{reps:8,weight:240}]
        m = SET_RE_EXPAND.search(part)
        if m:
            num_sets = int(m.group(1))
            reps     = int(m.group(2))
            weight   = float(m.group(3))
            for _ in range(num_sets):
                sets.append({"reps": reps, "weight": weight})
            continue

        # "reps*weight": plain single set
        # e.g. "8*70" → [{reps:8,weight:70}]
        m = SET_RE_SIMPLE.search(part)
        if m:
            sets.append({"reps": int(m.group(1)), "weight": float(m.group(2))})

    return sets

# ── Workout block parser ──────────────────────────────────────────────────────
def parse_raw_text(text: str) -> list[dict]:
    """
    Splits text into workout blocks and parses each one.
    Returns a list of workout dicts.
    """
    workouts = []
    last_year = datetime.now().year  # fallback if first entry has no year

    lines = text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Check if this line is a date line
        m = DATE_LINE_RE.match(line)
        if not m:
            i += 1
            continue

        # Parse the date
        day, month, year_str = m.group(1), m.group(2), m.group(3)
        iso_date, last_year = parse_date(day, month, year_str, last_year)

        # Next non-empty line is the workout name / gym line
        i += 1
        name = ""
        gym  = ""
        while i < len(lines) and not lines[i].strip():
            i += 1
        if i < len(lines):
            name_line = lines[i].strip()
            # Format: "Push Day - NYSC"  or  "Push Day"
            if " - " in name_line:
                parts = name_line.split(" - ", 1)
                name = parts[0].strip()
                gym  = parts[1].strip()
            else:
                name = name_line
            i += 1

        # Read exercise lines until we hit another date or end of file
        exercises = []
        while i < len(lines):
            eline = lines[i].strip()
            if not eline:
                i += 1
                continue
            if DATE_LINE_RE.match(eline):
                break  # start of next workout block

            # Exercise line: "Bench Press: 8*100 + 8*100 + 6*105"
            if ":" in eline:
                ex_name, _, sets_raw = eline.partition(":")
                sets = parse_sets(sets_raw)
                if sets:  # only add if we actually got sets
                    exercises.append({
                        "raw_name": ex_name.strip().lower(),
                        "sets": sets,
                    })
            i += 1

        if exercises:  # only record workouts that have at least one exercise
            workouts.append({
                "date": iso_date,
                "name": name or "Workout",
                "gym":  gym,
                # ← REVIEW THIS FIELD: change to "kg" for any workout where
                #   weights were recorded in kilograms
                "unit": "lbs",
                "exercises": exercises,
            })

    return workouts

# ── Exercise name fuzzy-matching ──────────────────────────────────────────────
def fetch_library_names(api_base: str, token: str = "") -> list[str]:
    """
    Fetch canonical exercise names.
    First tries the app's /library endpoint; if that fails or returns < 10 exercises,
    falls back to fetching directly from wger.de (public, no auth needed).
    """
    import urllib.request
    import ssl

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    # Try the app library first
    try:
        url = f"{api_base.rstrip('/')}/library"
        req = urllib.request.Request(url)
        if token:
            req.add_header("Authorization", f"Bearer {token}")
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            data = json.loads(resp.read())
        names = [ex["name"] for ex in data]
        if len(names) >= 10:
            return names
        print(f"  App library only has {len(names)} exercises — falling back to wger.de …")
    except Exception as e:
        print(f"  App library unavailable ({e}) — falling back to wger.de …")

    # Fallback: read from the pre-fetched local wger_exercises.json
    local_file = SCRIPTS_DIR / "wger_exercises.json"
    if local_file.exists():
        names = json.loads(local_file.read_text(encoding="utf-8"))
        print(f"  Loaded {len(names)} exercise names from {local_file.name}.")
        return names
    print("  ⚠ wger_exercises.json not found — mapping file will have __REVIEW__ for all names.")
    return []

def build_mapping(raw_names: list[str], canonical_names: list[str]) -> dict:
    """
    For each raw name, find the best fuzzy match in canonical_names.
    Returns a dict: { raw_name: canonical_name_or_flag }
    """
    mapping = {}
    for raw in sorted(raw_names):
        if not canonical_names:
            mapping[raw] = "__REVIEW__"
            continue
        matches = difflib.get_close_matches(raw, canonical_names, n=1, cutoff=0.55)
        if matches:
            mapping[raw] = matches[0]
        else:
            # No confident match — user must fill this in
            mapping[raw] = "__REVIEW__"
    return mapping

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Parse workout notes into JSON")
    parser.add_argument("--api", default="http://localhost:8000",
                        help="Base URL of your API (for fetching exercise library)")
    parser.add_argument("--token", default="",
                        help="Your JWT auth token (needed to fetch the exercise library)")
    args = parser.parse_args()

    # 1. Read raw text
    if not RAW_FILE.exists():
        print(f"✗ {RAW_FILE} not found. Create it and paste your workout notes in.")
        return
    text = RAW_FILE.read_text(encoding="utf-8")
    print(f"  Reading {RAW_FILE} ({len(text)} chars) …")

    # 2. Parse workouts
    workouts = parse_raw_text(text)
    print(f"  Parsed {len(workouts)} workout blocks.")

    # 3. Write parsed JSON
    PARSED_FILE.write_text(json.dumps(workouts, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  ✓ Wrote {PARSED_FILE}")

    # 4. Collect all unique raw exercise names
    raw_names = sorted({ex["raw_name"] for w in workouts for ex in w["exercises"]})
    NAMES_FILE.write_text("\n".join(raw_names), encoding="utf-8")
    print(f"  ✓ Wrote {NAMES_FILE}  ({len(raw_names)} unique exercise names)")

    # 5. Fetch canonical names from library
    print(f"  Fetching exercise library from {args.api} …")
    canonical_names = fetch_library_names(args.api, args.token)
    print(f"  Found {len(canonical_names)} canonical exercises in library.")

    # 6. Build + write mapping
    mapping = build_mapping(raw_names, canonical_names)
    review_count = sum(1 for v in mapping.values() if v == "__REVIEW__")
    MAPPING_FILE.write_text(json.dumps(mapping, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  ✓ Wrote {MAPPING_FILE}")
    if review_count:
        print(f"\n  ⚠  {review_count} exercise name(s) need manual review.")
        print(f"     Open {MAPPING_FILE} and replace __REVIEW__ values with the correct canonical name,")
        print(f"     or set to __SKIP__ to exclude that exercise from import.\n")

    print("\nNext steps:")
    print(f"  1. Open {PARSED_FILE}")
    print(f"     → For any workout where weights are in kg, change  \"unit\": \"lbs\"  to  \"unit\": \"kg\"")
    print(f"  2. Open {MAPPING_FILE}")
    print(f"     → Fix any __REVIEW__ entries (wrong suggestions or unknowns)")
    print(f"  3. Run:  python scripts/import_workouts.py --token YOUR_TOKEN --api {args.api}")
    if not args.token:
        print(f"\n  Tip: re-run with --token YOUR_TOKEN to auto-suggest exercise name matches.")

if __name__ == "__main__":
    main()
