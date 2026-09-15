"""
Rebuild the recruiter demo template from YOUR account (admin only).

The API snapshots the account that owns the token you pass, sanitizes it
(no credentials, no measurements, no notes, workout names reduced to their
split label), and stores it as the protected demo template. Every "Try Demo"
click clones that template into a disposable sandbox.

Usage:
    python scripts/refresh_demo_template.py --api https://your-app.up.railway.app --token YOUR_TOKEN

Getting your token: log in to the app, open DevTools → Application → Local Storage
and copy the value of the "token" key. Your account must be the ADMIN_USERNAME user.
"""

import argparse
import json
import urllib.error
import urllib.request


def main():
    parser = argparse.ArgumentParser(description="Rebuild the demo template from your account")
    parser.add_argument("--api", required=True, help="Base URL of the API")
    parser.add_argument("--token", required=True, help="Your JWT (admin account)")
    args = parser.parse_args()

    req = urllib.request.Request(
        f"{args.api.rstrip('/')}/demo/template/refresh",
        headers={"Authorization": f"Bearer {args.token}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            report = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"✗ {e.code}: {e.read().decode('utf-8', errors='replace')[:300]}")
        return

    print("✓ Demo template rebuilt")
    for table, n in report["counts"].items():
        print(f"    {table:<20} {n}")
    print(f"    workout dates        {report['workout_date_range'][0]} → {report['workout_date_range'][1]}")

    review = report["review_free_text"]
    print("\nFree text copied into the demo — review for anything personal:")
    print("  Workout names:", ", ".join(review["workout_names"]))
    for t in review["templates"]:
        print(f"  Template: {t['name']} — {t['description'] or ''}")
    if review["cardio_names"]:
        print("  Cardio names:", ", ".join(review["cardio_names"]))


if __name__ == "__main__":
    main()
