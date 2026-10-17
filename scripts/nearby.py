#!/usr/bin/env python3
"""
Nearby places for one apartment — Chez Toi BH student app.

Same approach as the `location-info` skill (Chez Toi BH/agents/operations/skills/location-info),
extended with more everyday categories, coordinates and place_id so the app can open directions.
Results are precomputed and bundled/stored, so the Google key never ships inside the app.

Usage (from App CTBH/app):
    python3 scripts/nearby.py "Rua Antônio de Albuquerque, 335 - Funcionários, Belo Horizonte" > src/data/nearby-demo.json

Key: GOOGLE_MAPS_API_KEY from the environment, or from ~/Desktop/Chez Toi BH/.env.
APIs used: Geocoding, Places (Nearby Search), Distance Matrix.
"""

import json
import math
import os
import re
import sys
import urllib.parse
import urllib.request

SKEMA_ADDRESS = "Avenida do Contorno, 5456, Savassi, Belo Horizonte, MG, Brasil"
PER_CATEGORY = 5

# Fixed list, as in location-info: Google's "shopping_mall" type also returns galleries and small arcades.
SHOPPING_MALLS = [
    {"name": "Diamond Mall", "address": "Av. Olegário Maciel, 1600, Santo Agostinho, Belo Horizonte, MG"},
    {"name": "Pátio Savassi", "address": "Av. do Contorno, 6061, São Pedro, Belo Horizonte, MG"},
    {"name": "BH Shopping", "address": "BR-356, 3049, Belvedere, Belo Horizonte, MG"},
    {"name": "Boulevard Shopping", "address": "Av. dos Andradas, 3000, Santa Efigênia, Belo Horizonte, MG"},
]

# Order here is the order of sections in the app.
# Google's types are loose (a laser clinic is a "hospital"), so each category also needs a keyword
# and a minimum number of reviews: students want the well-known places, then the closest of those.
CATEGORIES = [
    {"id": "supermarket", "type": "supermarket", "keyword": "supermercado", "radius": 1500, "min_reviews": 300},
    {"id": "pharmacy", "type": "pharmacy", "keyword": "drogaria", "radius": 1200, "min_reviews": 100},
    {"id": "bakery", "type": "bakery", "keyword": "padaria", "radius": 1200, "min_reviews": 200},
    {"id": "cafe", "type": "cafe", "keyword": "café", "radius": 1000, "min_reviews": 200},
    {"id": "gym", "type": "gym", "keyword": "academia", "radius": 1500, "min_reviews": 150},
    {"id": "laundry", "type": "laundry", "keyword": "lavanderia", "radius": 1500, "min_reviews": 30},
    {"id": "bank", "type": "bank", "keyword": None, "radius": 1000, "min_reviews": 20},
    {"id": "hospital", "type": "hospital", "keyword": "hospital pronto atendimento", "radius": 5000, "min_reviews": 300},
]


def load_key():
    key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
    if key:
        return key
    env = os.path.expanduser("~/Desktop/Chez Toi BH/.env")
    if os.path.exists(env):
        with open(env, encoding="utf-8") as f:
            for line in f:
                k, _, v = line.strip().partition("=")
                if k.strip() == "GOOGLE_MAPS_API_KEY":
                    return v.strip().strip('"').strip("'")
    sys.exit("ERROR: GOOGLE_MAPS_API_KEY not found")


def gmaps_get(endpoint, params, key):
    params = {**params, "key": key}
    url = f"https://maps.googleapis.com/maps/api/{endpoint}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def geocode(address, key):
    data = gmaps_get("geocode/json", {"address": address, "region": "br"}, key)
    if data.get("status") != "OK":
        sys.exit(f"ERROR: geocode failed — {data.get('status')} {data.get('error_message', '')}")
    r = data["results"][0]
    return r["geometry"]["location"], r["formatted_address"]


def meters(a, b):
    """Straight-line distance, only used to pick candidates before asking Distance Matrix."""
    dlat = math.radians(b["lat"] - a["lat"])
    dlng = math.radians(b["lng"] - a["lng"]) * math.cos(math.radians(a["lat"]))
    return 6371000 * math.hypot(dlat, dlng)


def clean_name(name):
    """Drop SEO tails Google lets businesses add: "Supernosso Grão Mogol: Açougue, Padaria…"."""
    for sep in (":", " | ", " • "):
        head = name.split(sep)[0].strip()
        if len(head) >= 4:
            name = head
    return name


def nearby(loc, cat, key):
    params = {
        "location": f"{loc['lat']},{loc['lng']}",
        "radius": cat["radius"],
        "type": cat["type"],
        "language": "pt-BR",
    }
    if cat["keyword"]:
        params["keyword"] = cat["keyword"]
    data = gmaps_get("place/nearbysearch/json", params, key)
    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        sys.exit(f"ERROR: places failed for {cat['id']} — {data.get('status')} {data.get('error_message', '')}")
    places = []
    for p in data.get("results", []):
        if p.get("business_status", "OPERATIONAL") != "OPERATIONAL":
            continue
        if (p.get("user_ratings_total") or 0) < cat["min_reviews"]:
            continue
        places.append({
            "name": clean_name(p["name"]),
            "address": p.get("vicinity", ""),
            "placeId": p["place_id"],
            "lat": p["geometry"]["location"]["lat"],
            "lng": p["geometry"]["location"]["lng"],
            "rating": p.get("rating"),
            "ratingCount": p.get("user_ratings_total"),
        })
    places.sort(key=lambda p: meters(loc, p))
    return places[:PER_CATEGORY]


def matrix(loc, destinations, key):
    """Walking metres/minutes and driving minutes for each destination (lat,lng or address)."""
    out = [{} for _ in destinations]
    if not destinations:
        return out
    for mode in ("walking", "driving"):
        data = gmaps_get("distancematrix/json", {
            "origins": f"{loc['lat']},{loc['lng']}",
            "destinations": "|".join(destinations),
            "mode": mode,
        }, key)
        if data.get("status") != "OK":
            sys.exit(f"ERROR: distance matrix — {data.get('status')} {data.get('error_message', '')}")
        for i, el in enumerate(data["rows"][0]["elements"]):
            if el.get("status") != "OK":
                continue
            mins = max(1, round(el["duration"]["value"] / 60))
            if mode == "walking":
                out[i]["distanceM"] = el["distance"]["value"]
                out[i]["walkMin"] = mins
            else:
                out[i]["driveMin"] = mins
    return out


def with_times(loc, places, key):
    times = matrix(loc, [f"{p['lat']},{p['lng']}" for p in places], key)
    merged = [{**p, **t} for p, t in zip(places, times) if "walkMin" in t]
    return sorted(merged, key=lambda p: p["walkMin"])


def main():
    if len(sys.argv) < 2:
        sys.exit('Usage: python3 scripts/nearby.py "Rua X, 123 - Bairro, Belo Horizonte"')
    key = load_key()
    loc, formatted = geocode(" ".join(sys.argv[1:]), key)

    skema = matrix(loc, [SKEMA_ADDRESS], key)[0]

    categories = []
    for c in CATEGORIES:
        categories.append({"id": c["id"], "places": with_times(loc, nearby(loc, c, key), key)})

    malls = []
    for m, t in zip(SHOPPING_MALLS, matrix(loc, [m["address"] for m in SHOPPING_MALLS], key)):
        if "walkMin" in t:
            g, _ = geocode(m["address"], key)
            malls.append({"name": m["name"], "address": m["address"], "placeId": None,
                          "lat": g["lat"], "lng": g["lng"], "rating": None, "ratingCount": None, **t})
    malls.sort(key=lambda p: p["walkMin"])
    # Malls go right after cafés in the list.
    categories.insert(4, {"id": "mall", "places": malls[:3]})

    print(json.dumps({
        "origin": {"address": formatted, **loc},
        "skema": skema,
        "categories": categories,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
