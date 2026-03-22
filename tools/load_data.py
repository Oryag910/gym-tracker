import json

def load_workouts():
    try:
        with open("data/workouts.json", "r") as f:
            return json.load(f)
    except:
        return []