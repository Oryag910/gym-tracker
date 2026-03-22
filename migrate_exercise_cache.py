"""
One-time migration: adds muscles_primary_ids, muscles_secondary_ids,
description, and category columns to the exercise_cache table.
Safe to run multiple times (skips existing columns).
"""
from api.database import engine
from sqlalchemy import text

new_columns = [
    ("muscles_primary_ids", "TEXT"),
    ("muscles_secondary_ids", "TEXT"),
    ("description", "TEXT"),
    ("category", "VARCHAR"),
]

with engine.connect() as conn:
    for col, type_ in new_columns:
        try:
            conn.execute(text(f"ALTER TABLE exercise_cache ADD COLUMN {col} {type_}"))
            print(f"Added column: {col}")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                print(f"Column {col} already exists, skipping.")
            else:
                raise
    conn.commit()

print("Migration complete.")
