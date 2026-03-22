from tools.load_data import load_workouts

def view_workouts():
    workouts = load_workouts()

    if not workouts:
        print("\n❌ No workouts found.\n")
        return

    print("\n📋 Your Workouts:\n")

    for i, workout in enumerate(workouts, start=1):
        print("=" * 40)
        print(f"🏋️ Workout {i}: {workout['name']}")
        print(f"📅 Date: {workout['date']}\n")

        for exercise in workout["exercises"]:
            print(f"  🔹 {exercise['name']}")

            for set_num, set_ in enumerate(exercise["sets"], start=1):
                print(f"     Set {set_num}: {set_['weight']} lbs x {set_['reps']} reps")

        print("=" * 40 + "\n")