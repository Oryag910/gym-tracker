from tools.load_data import load_workouts
from tools.save_data import save_workouts

def edit_workout():
    workouts = load_workouts()

    if not workouts:
        print("\n❌ No workouts to edit.\n")
        return

    # Step 1: choose workout
    for i, workout in enumerate(workouts, start=1):
        print(f"{i}. {workout['name']} ({workout['date']})")

    try:
        w_choice = int(input("Select workout: ")) - 1
        workout = workouts[w_choice]
    except:
        print("Invalid selection.")
        return

    # Step 2: choose exercise
    for i, ex in enumerate(workout["exercises"], start=1):
        print(f"{i}. {ex['name']}")

    try:
        e_choice = int(input("Select exercise: ")) - 1
        exercise = workout["exercises"][e_choice]
    except:
        print("Invalid selection.")
        return

    # Step 3: choose set
    for i, set_ in enumerate(exercise["sets"], start=1):
        weight = set_["weight"]
        reps = set_["reps"]

        weight_str = f"{weight} lbs" if weight is not None else "Bodyweight"
        reps_str = f"{reps} reps" if reps is not None else "Static"

        print(f"{i}. {weight_str} x {reps_str}")

    try:
        s_choice = int(input("Select set: ")) - 1
        selected_set = exercise["sets"][s_choice]
    except:
        print("Invalid selection.")
        return

    # Step 4: edit values
    print("\nEnter new values (leave blank or '-' to keep same)\n")

    weight_input = input("New weight: ")
    if weight_input.strip() != "" and weight_input != "-":
        try:
            selected_set["weight"] = float(weight_input)
        except:
            print("Invalid weight. Keeping old value.")

    reps_input = input("New reps: ")
    if reps_input.strip() != "" and reps_input != "-":
        try:
            selected_set["reps"] = int(reps_input)
        except:
            print("Invalid reps. Keeping old value.")

    # Step 5: save changes
    save_workouts(workouts)

    print("\n✏️ Workout updated!\n")