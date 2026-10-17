"""Allow-list of place ids the place-photo function serves: restaurants + travel + BH attractions.

Rewritten by restaurants.py and attractions.py. Redeploy the function after it changes:
    npx supabase functions deploy place-photo --project-ref miucfiiporxhvvbefonh --no-verify-jwt --use-api
"""

import json
import os

ROOT = os.path.join(os.path.dirname(__file__), "..")


def _ids(path, key):
    full = os.path.join(ROOT, path)
    if not os.path.exists(full):
        return []
    with open(full, encoding="utf-8") as f:
        data = json.load(f)
    items = data[key] if key else data
    return [item["placeId"] for item in items]


def write_allowlist():
    ids = (
        _ids("src/data/restaurants.json", "restaurants")
        + _ids("src/data/travel-places.json", None)
        + _ids("src/data/attractions.json", "attractions")
    )
    path = os.path.join(ROOT, "supabase", "functions", "place-photo", "allowed.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(sorted(set(ids)), f, indent=1)
    return len(set(ids))
