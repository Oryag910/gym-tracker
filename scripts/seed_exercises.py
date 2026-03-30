"""
One-off script to bulk-create exercises in the GlobalExercise library.

Usage:
  # Local dev server:
  ADMIN_USERNAME=youruser ADMIN_PASSWORD=yourpass python scripts/seed_exercises.py

  # Production:
  API_URL=https://your-railway-url.up.railway.app \
  ADMIN_USERNAME=youruser ADMIN_PASSWORD=yourpass \
  python scripts/seed_exercises.py
"""
import os
import sys
import requests

API_URL = os.getenv("API_URL", "http://localhost:8000")
TOKEN = os.getenv("API_TOKEN")       # grab from browser localStorage (takes priority)
USERNAME = os.getenv("ADMIN_USERNAME")
PASSWORD = os.getenv("ADMIN_PASSWORD")

if not TOKEN and (not USERNAME or not PASSWORD):
    print("ERROR: Set API_TOKEN, or both ADMIN_USERNAME and ADMIN_PASSWORD.")
    sys.exit(1)

# Muscle name (as used in the data below) → backend muscle ID
MUSCLE_MAP = {
    "chest": 4,
    "ant. deltoid": 2,
    "biceps": 1,
    "brachialis": 13,
    "abs": 6,
    "obliques": 14,
    "quads": 10,
    "serratus": 3,
    "traps": 9,
    "lats": 12,
    "triceps": 5,
    "hamstrings": 11,
    "glutes": 8,
    "calves": 7,
    "soleus": 15,
}

CATEGORY_MAP = {
    "chest": "Chest",
    "back": "Back",
    "shoulders": "Shoulders",
    "arms": "Arms",
    "legs": "Legs",
    "core": "Core",
    "cardio": "Cardio",
    "other": "Other",
}


def parse_muscles(s: str) -> list[int]:
    """Convert a semicolon-separated muscle string into a list of IDs."""
    if not s.strip():
        return []
    ids = []
    for name in s.split(";"):
        name = name.strip().lower()
        if name and name in MUSCLE_MAP:
            ids.append(MUSCLE_MAP[name])
    return ids


# Each tuple: (name, raw_category, primary_muscles, secondary_muscles)
# primary/secondary use semicolons to separate multiple muscles.
EXERCISES = [
    # ── CHEST ────────────────────────────────────────────────────────────────
    ("Barbell Bench Press", "chest", "Chest;Triceps", "Ant. Deltoid"),
    ("Incline Barbell Bench Press", "chest", "Chest;Ant. Deltoid", "Triceps"),
    ("Decline Barbell Bench Press", "chest", "Chest;Triceps", ""),
    ("Flat Dumbbell Press", "chest", "Chest;Triceps", "Ant. Deltoid"),
    ("Incline Dumbbell Press", "chest", "Chest;Ant. Deltoid", ""),
    ("Decline Dumbbell Press", "chest", "Chest;Triceps", ""),
    ("Machine Chest Press", "chest", "Chest;Triceps", ""),
    ("Smith Machine Bench Press", "chest", "Chest;Triceps", ""),
    ("Chest Fly (Dumbbell)", "chest", "Chest;Ant. Deltoid", ""),
    ("Incline Dumbbell Fly", "chest", "Chest;Ant. Deltoid", ""),
    ("Decline Dumbbell Fly", "chest", "Chest", ""),
    ("Cable Fly (Mid)", "chest", "Chest;Ant. Deltoid", ""),
    ("Cable Fly (Low to High)", "chest", "Chest;Ant. Deltoid", ""),
    ("Cable Fly (High to Low)", "chest", "Chest;Triceps", ""),
    ("Single Arm Cable Fly", "chest", "Chest", ""),
    ("Pec Deck Machine", "chest", "Chest", ""),
    ("Push-Up", "chest", "Chest;Triceps", "Ant. Deltoid"),
    ("Weighted Push-Up", "chest", "Chest;Triceps", ""),
    ("Deficit Push-Up", "chest", "Chest;Ant. Deltoid", ""),
    ("Feet Elevated Push-Up", "chest", "Chest;Ant. Deltoid", ""),
    ("Ring Push-Up", "chest", "Chest;Triceps", ""),
    ("Explosive Push-Up", "chest", "Chest;Triceps", ""),
    ("Clap Push-Up", "chest", "Chest", ""),
    ("Archer Push-Up", "chest", "Chest", ""),
    ("Chest Dip", "chest", "Chest;Triceps", ""),
    ("Weighted Chest Dip", "chest", "Chest;Triceps", ""),
    ("Machine Fly", "chest", "Chest", ""),
    ("Resistance Band Fly", "chest", "Chest", ""),
    ("Decline Push-Up", "chest", "Chest", ""),
    ("Wide Grip Push-Up", "chest", "Chest", ""),
    ("Close Grip Push-Up", "chest", "Triceps;Chest", ""),
    ("Single Arm Push-Up", "chest", "Chest;Triceps", ""),
    ("Paused Bench Press", "chest", "Chest;Triceps", ""),
    ("Tempo Bench Press", "chest", "Chest", ""),
    ("Spoto Press", "chest", "Chest;Triceps", ""),
    ("Floor Press", "chest", "Chest;Triceps", ""),
    ("Incline Machine Press", "chest", "Chest;Ant. Deltoid", ""),
    ("Decline Machine Press", "chest", "Chest", ""),
    ("Cable Press", "chest", "Chest;Triceps", ""),
    ("Single Arm Cable Press", "chest", "Chest", ""),
    ("Band Push-Up", "chest", "Chest;Triceps", ""),
    ("Isometric Push-Up Hold", "chest", "Chest", ""),
    ("Plate Press", "chest", "Chest", ""),
    ("Landmine Chest Press", "chest", "Chest;Ant. Deltoid", ""),
    ("Guillotine Press", "chest", "Chest", ""),
    ("Reverse Grip Bench Press", "chest", "Chest;Triceps", ""),
    ("Neutral Grip DB Press", "chest", "Chest;Triceps", ""),
    ("Hex Press", "chest", "Chest", ""),
    ("Squeeze Press", "chest", "Chest", ""),
    ("Smith Incline Press", "chest", "Chest;Ant. Deltoid", ""),
    ("Smith Decline Press", "chest", "Chest", ""),
    ("Incline Push-Up", "chest", "Chest", ""),
    ("Bench Dip Lean Forward", "chest", "Chest;Triceps", ""),
    ("Cable Crossovers Low", "chest", "Chest", ""),
    ("Cable Crossovers High", "chest", "Chest", ""),
    ("Chest Press Plate Loaded", "chest", "Chest", ""),
    ("Machine Incline Fly", "chest", "Chest", ""),
    ("Machine Decline Fly", "chest", "Chest", ""),
    ("Standing Cable Chest Press", "chest", "Chest", ""),
    ("Resistance Band Press", "chest", "Chest", ""),
    ("Isometric Chest Squeeze", "chest", "Chest", ""),
    ("Medicine Ball Push-Up", "chest", "Chest", ""),
    ("Suspension Trainer Push-Up", "chest", "Chest", ""),
    ("Decline Cable Fly", "chest", "Chest", ""),
    ("Incline Cable Fly", "chest", "Chest", ""),
    ("Half Kneeling Chest Press", "chest", "Chest", ""),
    ("Alternating DB Press", "chest", "Chest", ""),
    ("Paused Push-Up", "chest", "Chest", ""),
    ("Explosive Medicine Ball Chest Pass", "chest", "Chest", ""),

    # ── BACK ─────────────────────────────────────────────────────────────────
    ("Pull-Up", "back", "Lats;Biceps", "Brachialis"),
    ("Chin-Up", "back", "Lats;Biceps", ""),
    ("Neutral Grip Pull-Up", "back", "Lats;Brachialis", ""),
    ("Weighted Pull-Up", "back", "Lats;Biceps", ""),
    ("Assisted Pull-Up", "back", "Lats", ""),
    ("Lat Pulldown Wide", "back", "Lats", ""),
    ("Lat Pulldown Close", "back", "Lats;Biceps", ""),
    ("Reverse Grip Lat Pulldown", "back", "Lats;Biceps", ""),
    ("Single Arm Pulldown", "back", "Lats", ""),
    ("Straight Arm Pulldown", "back", "Lats", ""),
    ("Barbell Row", "back", "Lats;Biceps", "Traps"),
    ("Pendlay Row", "back", "Lats;Traps", ""),
    ("Dumbbell Row", "back", "Lats;Biceps", ""),
    ("Chest Supported Row", "back", "Lats", ""),
    ("Seated Cable Row", "back", "Lats;Biceps", ""),
    ("T-Bar Row", "back", "Lats;Biceps", ""),
    ("Single Arm Cable Row", "back", "Lats", ""),
    ("Inverted Row", "back", "Lats;Biceps", ""),
    ("Deadlift", "back", "Glutes;Hamstrings", "Traps"),
    ("Sumo Deadlift", "back", "Glutes;Hamstrings", ""),
    ("Rack Pull", "back", "Traps;Glutes", ""),
    ("Block Pull", "back", "Traps", ""),
    ("Snatch Grip Deadlift", "back", "Traps;Glutes", ""),
    ("Romanian Deadlift (Back Focus)", "back", "Hamstrings;Glutes", ""),
    ("Shrug Barbell", "back", "Traps", ""),
    ("Shrug Dumbbell", "back", "Traps", ""),
    ("Behind Back Shrug", "back", "Traps", ""),
    ("Farmer's Carry", "back", "Traps;Abs", ""),
    ("Trap Bar Deadlift", "back", "Glutes;Traps", ""),
    ("Cable Row Wide Grip", "back", "Lats", ""),
    ("Cable Row Close Grip", "back", "Lats;Biceps", ""),
    ("Resistance Band Row", "back", "Lats", ""),
    ("Seal Row", "back", "Lats", ""),
    ("Meadows Row", "back", "Lats", ""),
    ("Machine Row", "back", "Lats", ""),
    ("Machine High Row", "back", "Lats", ""),
    ("Machine Low Row", "back", "Lats", ""),
    ("Kroc Row", "back", "Lats;Biceps", ""),
    ("Renegade Row", "back", "Lats;Abs", ""),
    ("Suspension Trainer Row", "back", "Lats", ""),
    ("Reverse Fly Machine", "back", "Traps", ""),
    ("Bent Over Rear Raise", "back", "Traps", ""),
    ("Cable Pullover", "back", "Lats", ""),
    ("DB Pullover", "back", "Lats", ""),
    ("Isometric Hang", "back", "Lats", ""),
    ("Scapular Pull-Up", "back", "Traps", ""),
    ("Rack Deadlift Hold", "back", "Traps", ""),
    ("Deficit Deadlift", "back", "Glutes", ""),
    ("Paused Deadlift", "back", "Glutes", ""),
    ("Tempo Row", "back", "Lats", ""),
    ("Alternating Cable Row", "back", "Lats", ""),
    ("Single Arm Machine Row", "back", "Lats", ""),
    ("Neutral Grip Row Machine", "back", "Lats", ""),
    ("High Pull", "back", "Traps", ""),
    ("Upright Row", "back", "Traps", ""),
    ("Cable Upright Row", "back", "Traps", ""),
    ("Barbell Upright Row", "back", "Traps", ""),

    # ── SHOULDERS ────────────────────────────────────────────────────────────
    ("Overhead Barbell Press", "shoulders", "Ant. Deltoid;Triceps", ""),
    ("Dumbbell Shoulder Press", "shoulders", "Ant. Deltoid;Triceps", ""),
    ("Arnold Press", "shoulders", "Ant. Deltoid;Triceps", ""),
    ("Machine Shoulder Press", "shoulders", "Ant. Deltoid;Triceps", ""),
    ("Smith Shoulder Press", "shoulders", "Ant. Deltoid;Triceps", ""),
    ("Seated DB Press", "shoulders", "Ant. Deltoid;Triceps", ""),
    ("Standing DB Press", "shoulders", "Ant. Deltoid;Triceps", ""),
    ("Push Press", "shoulders", "Ant. Deltoid;Triceps", ""),
    ("Strict Press", "shoulders", "Ant. Deltoid;Triceps", ""),
    ("Z Press", "shoulders", "Ant. Deltoid;Triceps", ""),
    ("Landmine Press", "shoulders", "Ant. Deltoid;Chest", ""),
    ("Half Kneeling Landmine Press", "shoulders", "Ant. Deltoid", ""),
    ("Single Arm Landmine Press", "shoulders", "Ant. Deltoid", ""),
    ("Front Raise DB", "shoulders", "Ant. Deltoid", ""),
    ("Front Raise Plate", "shoulders", "Ant. Deltoid", ""),
    ("Cable Front Raise", "shoulders", "Ant. Deltoid", ""),
    ("Band Front Raise", "shoulders", "Ant. Deltoid", ""),
    ("Alternating Front Raise", "shoulders", "Ant. Deltoid", ""),
    ("Barbell Front Raise", "shoulders", "Ant. Deltoid", ""),
    ("Pike Push-Up", "shoulders", "Ant. Deltoid;Triceps", ""),
    ("Handstand Push-Up", "shoulders", "Ant. Deltoid;Triceps", ""),
    ("Wall Handstand Push-Up", "shoulders", "Ant. Deltoid", ""),
    ("Deficit HSPU", "shoulders", "Ant. Deltoid", ""),
    ("Battle Rope Slams", "shoulders", "Ant. Deltoid;Abs", ""),
    ("Overhead Hold", "shoulders", "Ant. Deltoid", ""),
    ("Plate Overhead Carry", "shoulders", "Ant. Deltoid;Abs", ""),
    ("Single Arm Overhead Carry", "shoulders", "Ant. Deltoid;Abs", ""),
    ("DB Push Press", "shoulders", "Ant. Deltoid", ""),
    ("Barbell Push Jerk", "shoulders", "Ant. Deltoid", ""),
    ("Split Jerk", "shoulders", "Ant. Deltoid", ""),

    # ── ARMS ─────────────────────────────────────────────────────────────────
    ("Barbell Curl", "arms", "Biceps;Brachialis", ""),
    ("EZ Bar Curl", "arms", "Biceps", ""),
    ("Dumbbell Curl", "arms", "Biceps;Brachialis", ""),
    ("Hammer Curl", "arms", "Brachialis;Biceps", ""),
    ("Incline Curl", "arms", "Biceps", ""),
    ("Preacher Curl", "arms", "Biceps", ""),
    ("Cable Curl", "arms", "Biceps", ""),
    ("Reverse Curl", "arms", "Brachialis", ""),
    ("Concentration Curl", "arms", "Biceps", ""),
    ("Zottman Curl", "arms", "Biceps;Brachialis", ""),
    ("Cross Body Hammer Curl", "arms", "Brachialis", ""),
    ("Spider Curl", "arms", "Biceps", ""),
    ("Machine Curl", "arms", "Biceps", ""),
    ("Single Arm Cable Curl", "arms", "Biceps", ""),
    ("Resistance Band Curl", "arms", "Biceps", ""),
    ("21s Curl", "arms", "Biceps", ""),
    ("Drag Curl", "arms", "Biceps", ""),
    ("Bayesian Curl", "arms", "Biceps", ""),
    ("Seated DB Curl", "arms", "Biceps", ""),
    ("Standing Alternating Curl", "arms", "Biceps", ""),
    ("Close Grip Bench Press", "arms", "Triceps;Chest", ""),
    ("Skullcrusher", "arms", "Triceps", ""),
    ("EZ Skullcrusher", "arms", "Triceps", ""),
    ("Cable Pushdown Bar", "arms", "Triceps", ""),
    ("Cable Pushdown Rope", "arms", "Triceps", ""),
    ("Overhead DB Extension", "arms", "Triceps", ""),
    ("Overhead Cable Extension", "arms", "Triceps", ""),
    ("Dips", "arms", "Triceps;Chest", ""),
    ("Bench Dip", "arms", "Triceps", ""),
    ("Kickback", "arms", "Triceps", ""),
    ("Machine Tricep Extension", "arms", "Triceps", ""),
    ("Single Arm Pushdown", "arms", "Triceps", ""),
    ("Reverse Grip Pushdown", "arms", "Triceps", ""),
    ("JM Press", "arms", "Triceps", ""),
    ("Diamond Push-Up", "arms", "Triceps;Chest", ""),
    ("Weighted Dip", "arms", "Triceps", ""),
    ("Band Tricep Extension", "arms", "Triceps", ""),
    ("Decline Skullcrusher", "arms", "Triceps", ""),
    ("Cable Kickback", "arms", "Triceps", ""),
    ("Isometric Tricep Hold", "arms", "Triceps", ""),

    # ── LEGS ─────────────────────────────────────────────────────────────────
    ("Back Squat", "legs", "Quads;Glutes", "Hamstrings"),
    ("Front Squat", "legs", "Quads;Glutes", ""),
    ("Goblet Squat", "legs", "Quads;Glutes", ""),
    ("Smith Squat", "legs", "Quads;Glutes", ""),
    ("Hack Squat", "legs", "Quads", ""),
    ("Leg Press", "legs", "Quads;Glutes", ""),
    ("Bulgarian Split Squat", "legs", "Quads;Glutes", ""),
    ("Walking Lunge", "legs", "Quads;Glutes", ""),
    ("Reverse Lunge", "legs", "Glutes;Quads", ""),
    ("Step-Up", "legs", "Quads;Glutes", ""),
    ("Sissy Squat", "legs", "Quads", ""),
    ("Romanian Deadlift", "legs", "Hamstrings;Glutes", ""),
    ("Stiff Leg Deadlift", "legs", "Hamstrings", ""),
    ("Good Morning", "legs", "Hamstrings;Glutes", ""),
    ("Hip Thrust", "legs", "Glutes", ""),
    ("Glute Bridge", "legs", "Glutes", ""),
    ("Cable Pull Through", "legs", "Glutes;Hamstrings", ""),
    ("Nordic Curl", "legs", "Hamstrings", ""),
    ("Lying Leg Curl", "legs", "Hamstrings", ""),
    ("Seated Leg Curl", "legs", "Hamstrings", ""),
    ("Single Leg RDL", "legs", "Hamstrings;Glutes", ""),
    ("Standing Calf Raise", "legs", "Calves;Soleus", ""),
    ("Seated Calf Raise", "legs", "Soleus", ""),
    ("Donkey Calf Raise", "legs", "Calves", ""),
    ("Leg Press Calf Raise", "legs", "Calves", ""),
    ("Single Leg Calf Raise", "legs", "Calves", ""),
    ("Box Jump", "legs", "Quads;Glutes", ""),
    ("Broad Jump", "legs", "Glutes;Hamstrings", ""),
    ("Jump Squat", "legs", "Quads;Glutes", ""),
    ("Split Squat Jump", "legs", "Quads;Glutes", ""),
    ("Sled Push", "legs", "Quads;Glutes", ""),
    ("Sled Pull", "legs", "Hamstrings;Glutes", ""),
    ("Trap Bar Deadlift (Legs)", "legs", "Glutes;Quads", ""),
    ("Pause Squat", "legs", "Quads", ""),
    ("Tempo Squat", "legs", "Quads", ""),
    ("Cyclist Squat", "legs", "Quads", ""),

    # ── CORE ─────────────────────────────────────────────────────────────────
    ("Crunch", "core", "Abs", ""),
    ("Decline Sit-Up", "core", "Abs", ""),
    ("Cable Crunch", "core", "Abs", ""),
    ("Hanging Leg Raise", "core", "Abs", ""),
    ("Hanging Knee Raise", "core", "Abs", ""),
    ("Lying Leg Raise", "core", "Abs", ""),
    ("Ab Wheel Rollout", "core", "Abs;Serratus", ""),
    ("Plank", "core", "Abs", ""),
    ("Side Plank", "core", "Obliques;Abs", ""),
    ("Russian Twist", "core", "Obliques;Abs", ""),
    ("Bicycle Crunch", "core", "Abs;Obliques", ""),
    ("Dead Bug", "core", "Abs", ""),
    ("V-Up", "core", "Abs", ""),
    ("Mountain Climber", "core", "Abs;Obliques", ""),
    ("Toe Touch Crunch", "core", "Abs", ""),
    ("Sit-Up", "core", "Abs", ""),
    ("Flutter Kick", "core", "Abs", ""),
    ("Hollow Hold", "core", "Abs", ""),
    ("Dragon Flag", "core", "Abs", ""),
    ("Cable Woodchopper", "core", "Obliques;Abs", ""),
    ("Landmine Rotation", "core", "Obliques;Abs", ""),
    ("Side Bend DB", "core", "Obliques", ""),
    ("Side Bend Cable", "core", "Obliques", ""),
    ("Plank Shoulder Tap", "core", "Abs", ""),
    ("TRX Pike", "core", "Abs", ""),
    ("TRX Knee Tuck", "core", "Abs", ""),
    ("Reverse Crunch", "core", "Abs", ""),
    ("Weighted Sit-Up", "core", "Abs", ""),
    ("Stability Ball Crunch", "core", "Abs", ""),
    ("Stability Ball Rollout", "core", "Abs", ""),

    # ── CARDIO ───────────────────────────────────────────────────────────────
    ("Running Treadmill", "cardio", "Quads;Glutes", "Hamstrings"),
    ("Walking Incline", "cardio", "Glutes;Quads", ""),
    ("Stair Climber", "cardio", "Glutes;Quads", ""),
    ("Cycling", "cardio", "Quads;Glutes", ""),
    ("Rowing Machine", "cardio", "Lats;Traps", "Abs"),
    ("Elliptical", "cardio", "Quads;Glutes", ""),
    ("Jump Rope", "cardio", "Calves;Soleus", ""),
    ("Burpee", "cardio", "Abs;Chest", ""),
    ("Battle Rope Waves", "cardio", "Abs;Ant. Deltoid", ""),
    ("Sled Sprint", "cardio", "Quads;Glutes", ""),

    # ── OTHER ────────────────────────────────────────────────────────────────
    ("Kettlebell Swing", "other", "Glutes;Hamstrings", ""),
    ("Turkish Get-Up", "other", "Abs;Ant. Deltoid", ""),
    ("Medicine Ball Slam", "other", "Abs;Lats", ""),
    ("Bear Crawl", "other", "Abs;Ant. Deltoid", ""),
    ("Farmer Carry Heavy", "other", "Traps;Abs", ""),
    ("Sandbag Carry", "other", "Glutes;Abs", ""),
    ("Overhead Carry", "other", "Ant. Deltoid;Abs", ""),
    ("Zercher Carry", "other", "Abs;Glutes", ""),
    ("Tire Flip", "other", "Glutes;Hamstrings", ""),
    ("Agility Ladder", "other", "Quads", ""),
]


def main():
    # 1. Authenticate
    print(f"Connecting to {API_URL} ...")
    if TOKEN:
        token = TOKEN
        print("Using provided API_TOKEN.\n")
    else:
        r = requests.post(f"{API_URL}/auth/login", json={"username": USERNAME, "password": PASSWORD})
        if r.status_code != 200:
            print(f"Login failed: {r.status_code} {r.text}")
            sys.exit(1)
        token = r.json()["access_token"]
        print("Logged in successfully.\n")
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Fetch existing exercises to avoid duplicates
    existing_resp = requests.get(f"{API_URL}/library", headers=headers)
    print(f"GET /library → {existing_resp.status_code}")
    try:
        existing_names = {ex["name"].lower() for ex in existing_resp.json()} if existing_resp.status_code == 200 else set()
    except Exception:
        print(f"  (could not parse response: {existing_resp.text[:200]})")
        existing_names = set()
    print(f"Found {len(existing_names)} existing exercises in library.\n")

    # 3. Create each exercise
    created = skipped = errors = 0
    for name, raw_cat, pri_str, sec_str in EXERCISES:
        if name.lower() in existing_names:
            print(f"  SKIP (exists)  {name}")
            skipped += 1
            continue

        payload = {
            "name": name,
            "category": CATEGORY_MAP.get(raw_cat.lower(), raw_cat.title()),
            "muscles_primary_ids": parse_muscles(pri_str),
            "muscles_secondary_ids": parse_muscles(sec_str),
        }
        resp = requests.post(f"{API_URL}/library", json=payload, headers=headers)
        if resp.status_code == 201:
            print(f"  OK             {name}")
            created += 1
        else:
            print(f"  ERROR {resp.status_code}       {name}: {resp.text}")
            errors += 1

    print(f"\n{'='*50}")
    print(f"Done: {created} created, {skipped} skipped, {errors} errors")
    print(f"Total exercises processed: {len(EXERCISES)}")


if __name__ == "__main__":
    main()
