from tools.load_data import load_workouts

def workout_stats():
    workouts = load_workouts()

    if not workouts:
        print("\n❌ No workouts found.\n")
        return

    total_workouts = len(workouts)
    total_exercises = 0
    total_sets = 0
    total_volume = 0

    for workout in workouts:
        for exercise in workout["exercises"]:
            total_exercises += 1

            for set_ in exercise["sets"]:
                total_sets += 1

                weight = set_["weight"]
                reps = set_["reps"]

                # Only count volume if both exist
                if weight is not None and reps is not None:
                    total_volume += weight * reps

    print("\n📊 Workout Stats")
    print("=" * 30)
    print(f"Total Workouts: {total_workouts}")
    print(f"Total Exercises: {total_exercises}")
    print(f"Total Sets: {total_sets}")
    print(f"Total Volume: {int(total_volume)} lbs")
    print("=" * 30 + "\n")