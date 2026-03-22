from fastapi import FastAPI
from tools.load_data import load_workouts
from tools.save_data import save_workouts

app = FastAPI()

@app.get("/workouts")
def get_workouts():
    return load_workouts()

@app.post("/workouts")
def add_workout(workout: dict):
    workouts = load_workouts()
    workouts.append(workout)
    save_workouts(workouts)
    return {"message": "Workout added"}

@app.get("/stats")
def get_stats():
    workouts = load_workouts()

    total_sets = 0
    total_volume = 0

    for workout in workouts:
        for exercise in workout["exercises"]:
            for set_ in exercise["sets"]:
                total_sets += 1

                if set_["weight"] and set_["reps"]:
                    total_volume += set_["weight"] * set_["reps"]

    return {
        "total_workouts": len(workouts),
        "total_sets": total_sets,
        "total_volume": total_volume
    }