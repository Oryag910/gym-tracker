from datetime import datetime
from tools.load_data import load_workouts
from tools.save_data import save_workouts

def log_workout():
    workouts = load_workouts()

    name = input("Workout name (e.g. Push Day): ")

    workout = {
        "name": name,
        "date": str(datetime.now().date()),
        "exercises": []
    }

    while True:
        add_ex = input("Add exercise? (y/n): ")
        if add_ex.lower() != "y":
            break

        ex_name = input("Exercise name: ")
        exercise = {
            "name": ex_name,
            "sets": []
        }

        while True:
            add_set = input("Add set? (y/n): ")
            if add_set.lower() != "y":
                break

            # Weight input
            weight_input = input("Weight (''or '-' if none): ")

            if weight_input.strip() == "" or weight_input == "-":
                weight = None
            else:
                try:
                    weight = float(weight_input)
                except:
                    print("Invalid weight. Skipping set.")
                    continue

            # Reps input
            reps_input = input("Reps (or '-' if none): ")

            if reps_input.strip() == "" or reps_input == "-":
                reps = None
            else:
                try:
                    reps = int(reps_input)
                except:
                    print("Invalid reps. Skipping set.")
                    continue

            exercise["sets"].append({
                "weight": weight,
                "reps": reps
            })

        workout["exercises"].append(exercise)

    workouts.append(workout)
    save_workouts(workouts)

    print("✅ Workout saved!")