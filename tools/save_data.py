import json

def save_workouts(workouts):
    with open("data/workouts.json", "w") as f:
        json.dump(workouts, f, indent=2)