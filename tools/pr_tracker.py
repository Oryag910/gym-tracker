from tools.load_data import load_workouts

def pr_tracker():
    workouts = load_workouts()

    if not workouts:
        print("\n❌ No workouts found.\n")
        return

    prs = {}  # store PRs per exercise

    for workout in workouts:
        for exercise in workout["exercises"]:
            name = exercise["name"]

            for set_ in exercise["sets"]:
                weight = set_["weight"]

                # skip if no weight (bodyweight/static)
                if weight is None:
                    continue

                if name not in prs:
                    prs[name] = weight
                else:
                    prs[name] = max(prs[name], weight)

    print("\n🏆 Personal Records")
    print("=" * 30)

    for exercise, pr in prs.items():
        print(f"{exercise}: {pr} lbs")

    print("=" * 30 + "\n")