"""
One-time migration: imports data/workouts.json into SQLite under a seed user.
Run once: python migrate.py
"""
import json
from datetime import date as date_type

from dotenv import load_dotenv
load_dotenv()

from api.database import engine, SessionLocal, Base
from api.models import User, Workout, Exercise, Set
from api.auth import hash_password

Base.metadata.create_all(bind=engine)

SEED_USERNAME = "admin"
SEED_EMAIL = "admin@gymtracker.local"
SEED_PASSWORD = "changeme123"
JSON_PATH = "data/workouts.json"


def run():
    db = SessionLocal()
    try:
        # Create or get seed user
        user = db.query(User).filter(User.username == SEED_USERNAME).first()
        if not user:
            user = User(
                username=SEED_USERNAME,
                email=SEED_EMAIL,
                password_hash=hash_password(SEED_PASSWORD),
            )
            db.add(user)
            db.flush()
            print(f"Created user: {SEED_USERNAME} / {SEED_PASSWORD}")
        else:
            print(f"User '{SEED_USERNAME}' already exists, skipping creation.")

        # Load workouts.json
        try:
            with open(JSON_PATH) as f:
                workouts_data = json.load(f)
        except FileNotFoundError:
            print(f"No {JSON_PATH} found, skipping workout import.")
            db.commit()
            return

        imported = 0
        for w_data in workouts_data:
            workout_date = date_type.fromisoformat(w_data["date"])
            workout = Workout(user_id=user.id, name=w_data["name"], date=workout_date)
            db.add(workout)
            db.flush()

            for idx, ex_data in enumerate(w_data.get("exercises", [])):
                exercise = Exercise(workout_id=workout.id, name=ex_data["name"], order_index=idx)
                db.add(exercise)
                db.flush()

                for set_num, s_data in enumerate(ex_data.get("sets", []), start=1):
                    s = Set(
                        exercise_id=exercise.id,
                        weight=s_data.get("weight"),
                        reps=s_data.get("reps"),
                        set_number=set_num,
                    )
                    db.add(s)

            imported += 1

        db.commit()
        print(f"Imported {imported} workout(s) from {JSON_PATH}.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
