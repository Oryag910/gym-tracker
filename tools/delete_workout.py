from tools.load_data import load_workouts
from tools.save_data import save_workouts

def delete_workout():
    workouts = load_workouts()

    if not workouts:
        print("No workouts to delete.")
        return

    # Show workouts
    for i, workout in enumerate(workouts, start=1):
        print(f"{i}. {workout['name']} ({workout['date']})")

    # Get user choice
    try:
        choice = int(input("Enter workout number to delete: "))
        if choice < 1 or choice > len(workouts):
            print("Invalid selection.")
            return
    except:
        print("Please enter a valid number.")
        return

    # Remove workout
    removed = workouts.pop(choice - 1)

    save_workouts(workouts)

    print(f"🗑️ Deleted: {removed['name']}")