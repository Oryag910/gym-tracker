from tools.log_workout import log_workout
from tools.view_workouts import view_workouts
from tools.delete_workout import delete_workout
from tools.workout_stats import workout_stats
from tools.pr_tracker import pr_tracker
from tools.edit_workout import edit_workout

def main():
    print("\n🏋️ Gym Tracker CLI")
    print("=" * 25)
    print("1. Log Workout")
    print("2. View Workouts")
    print("3. Delete Workout")
    print("4. View Stats")
    print("5. View PRs")
    print("6. Edit Workout")
    print("=" * 25)

    choice = input("Choose an option: ")

    if choice == "1":
        log_workout()
    elif choice == "2":
        view_workouts()
    elif choice == "3":
        delete_workout()
    elif choice == "4":
        workout_stats()
    elif choice == "5":
        pr_tracker()
    elif choice == "6":
        edit_workout()
    else:
        print("Invalid choice")

if __name__ == "__main__":
    main()