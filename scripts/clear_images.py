"""Clears image_url for all exercises in the library so auto-fill can re-run cleanly."""
import os, sys, requests

API_URL = os.getenv("API_URL", "http://localhost:8000")
TOKEN = os.getenv("API_TOKEN")

if not TOKEN:
    print("ERROR: Set API_TOKEN")
    sys.exit(1)

headers = {"Authorization": f"Bearer {TOKEN}"}

exercises = requests.get(f"{API_URL}/library", headers=headers).json()
print(f"Found {len(exercises)} exercises. Clearing images...")

for ex in exercises:
    requests.put(f"{API_URL}/library/{ex['id']}", json={"image_url": ""}, headers=headers)
    print(f"  Cleared: {ex['name']}")

print("Done.")
