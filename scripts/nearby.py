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
PER_CATEGORY = 3

# Fixed list, always shown in full (owner, 2026-10-19), as in location-info: Google's "shopping_mall" type also returns galleries and small arcades.
SHOPPING_MALLS = [
    {"name": "Diamond Mall", "address": "Av. Olegário Maciel, 1600, Santo Agostinho, Belo Horizonte, MG"},
    {"name": "Pátio Savassi", "address": "Av. do Contorno, 6061, São Pedro, Belo Horizonte, MG"},
    {"name": "BH Shopping", "address": "BR-356, 3049, Belvedere, Belo Horizonte, MG"},
    {"name": "Boulevard Shopping", "address": "Av. dos Andradas, 3000, Santa Efigênia, Belo Horizonte, MG"},
]

# Fixed list (owner, 2026-10-19): the top private hospitals of BH and Nova Lima in Newsweek's World's Best
# Hospitals 2026 (Mater Dei Santo Agostinho 17th, Biocor 18th, Felício Rocho 20th, Madre Teresa 21st,
# Vila da Serra 36th) plus Mater Dei Contorno. Google's nearest "hospitals" were specialised or plan-only clinics.
HOSPITALS = [
    {"name": "Mater Dei Santo Agostinho", "address": "R. Mato Grosso, 1100 - Santo Agostinho, Belo Horizonte",
     "placeId": "ChIJbVAFp2eXpgAR_tJTs9rvKbs"},
    {"name": "Mater Dei Contorno", "address": "Av. do Contorno, 9000 - Barro Preto, Belo Horizonte",
     "placeId": "ChIJHb9632uXpgAR-V47J3ihv64"},
    {"name": "Hospital Felício Rocho", "address": "Av. do Contorno, 9530 - Barro Preto, Belo Horizonte",
     "placeId": "ChIJ-88BDkKXpgARPx-DOxyZJNM"},
    {"name": "Hospital Madre Teresa", "address": "Av. Raja Gabáglia, 1002 - Gutierrez, Belo Horizonte",
     "placeId": "ChIJc4CNN2KXpgARMa90y5Bk3K8"},
    {"name": "Biocor Instituto (Rede D'Or)", "address": "Alameda Oscar Niemeyer, 217 - Vila da Serra, Nova Lima",
     "placeId": "ChIJKfdHqP-XpgARpMIQX1799vI"},
    {"name": "Hospital Vila da Serra", "address": "Alameda Oscar Niemeyer, 499 - Vila da Serra, Nova Lima",
     "placeId": "ChIJHX6B-wGYpgAROGPlemvCAIA"},
]

# Trusted chains (owner, 2026-10-19): for categories with "chains", the list is the nearest unit of each
# chain, whatever its rating or review count (the name is the guarantee), mixed with any other place that is
# both very well rated and widely reviewed ("exception"), and only then filled with the generic nearest places.
# Two brands can own the same shop (EPA Plus and Supermercados BH on R. Ceará): units this close count once.
CHAIN_SEARCH_RADIUS = 4000
# Same limit as WALK_LIMIT_MIN in src/lib/nearby.ts: past it, a place is not "near" (a trusted chain 40 min away
# must not push out a good shop next door).
WALK_LIMIT = 20
# When too few places pass a category's cut, the list is completed with places slightly under it (wider
# search, half the reviews, 0.3 less on the rating) instead of staying short or empty (seen in Prado: no
# bakery at 4.2 / 500 reviews within 15 min; in Buritis: 2 pharmacies).
RELAX_RATING = 0.3
RELAX_RADIUS = 2000
SAME_SHOP_M = 15

# Order here is the order of sections in the app.
# Google's types are loose (a laser clinic is a "hospital"), so each category also needs a keyword
# and a minimum number of reviews: students want the well-known places, then the closest of those.
CATEGORIES = [
    {"id": "supermarket", "type": "supermarket", "keyword": "supermercado", "radius": 1500, "min_reviews": 300,
     "chains": [("Verdemar", r"verdemar"), ("Supernosso", r"super ?nosso"), ("EPA", r"\bepa\b"),
                ("Supermercados BH", r"supermercados bh"), ("Bem Hortifruti", r"bem hortifruti")]},
    {"id": "pharmacy", "type": "pharmacy", "keyword": "drogaria", "radius": 1200, "min_reviews": 100,
     "chains": [("Drogaria Araujo", r"arauj"), ("Droga Raia", r"droga ?raia"), ("Drogaria Pacheco", r"pacheco")]},
    # Bakeries (owner, 2026-10-19): rating and review count both matter. Google's "bakery" also covers cake
    # and sweet shops, brigadeiro shops and even burger places: "exclude" drops them by name.
    {"id": "bakery", "type": "bakery", "keyword": "padaria", "radius": 1500, "min_reviews": 500,
     "min_rating": 4.2, "max_walk": 15, "exclude": r"doce|bolo|burger|granulado|chocolate|brigadeir|sorvete|cookie|eu que fiz"},
    {"id": "gym", "type": "gym", "keyword": "academia", "radius": 1500, "min_reviews": 150,
     "chains": [("Smart Fit", r"smart ?fit"), ("BlueFit", r"bluefit"), ("Contorno do Corpo", r"contorno do corpo"),
                ("Pratique Fitness", r"pratique"), ("Bodytech", r"bodytech")],
     "exception": {"min_rating": 4.5, "min_reviews": 500}},
    # Laundries (owner, 2026-10-19): quality first, then proximity — good rating, enough reviews, walkable.
    {"id": "laundry", "type": "laundry", "keyword": "lavanderia", "radius": 2000, "min_reviews": 50,
     "min_rating": 4.5, "max_walk": 15, "exclude": r"sof[aá]|tapete|estofad|cortina"},
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
    # Google returns at most 20 places per search. Quality-filtered categories also search without the keyword,
    # which finds well-rated places whose listing doesn't use the word (a "padaria" that calls itself a café).
    searches = [{**params, "keyword": cat["keyword"]}] if cat["keyword"] else [params]
    if cat["keyword"] and cat.get("min_rating"):
        searches.append(params)
    results = {}
    for search in searches:
        data = gmaps_get("place/nearbysearch/json", search, key)
        if data.get("status") not in ("OK", "ZERO_RESULTS"):
            sys.exit(f"ERROR: places failed for {cat['id']} — {data.get('status')} {data.get('error_message', '')}")
        results.update({p["place_id"]: p for p in data.get("results", [])})
    places = []
    for p in results.values():
        if p.get("business_status", "OPERATIONAL") != "OPERATIONAL":
            continue
        if (p.get("user_ratings_total") or 0) < cat["min_reviews"]:
            continue
        if (p.get("rating") or 0) < cat.get("min_rating", 0):
            continue
        if cat.get("exclude") and re.search(cat["exclude"], p["name"], re.I):
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
    return places


def short_address(formatted):
    """Text Search gives "Rua X, 1 - Bairro, Belo Horizonte - MG, 30000-000, Brasil"; Nearby gives it shorter."""
    return formatted.split(" - MG")[0]


def same_shop(a, b):
    """Same street and number, or practically the same spot: two brands owning one shop."""
    street = lambda u: u["address"].split(" - ")[0].strip().lower()
    return meters(a, b) <= SAME_SHOP_M or (re.search(r"\d", street(a)) and street(a) == street(b))


def chain_places(loc, cat, key):
    """Nearest operational unit of each trusted chain (Text Search by chain name, then walking time)."""
    picks = []
    for query, pattern in cat["chains"]:
        data = gmaps_get("place/textsearch/json", {
            "query": query, "location": f"{loc['lat']},{loc['lng']}", "radius": CHAIN_SEARCH_RADIUS,
            "type": cat["type"], "language": "pt-BR",
        }, key)
        units = [{
            "name": clean_name(p["name"]),
            "address": short_address(p.get("formatted_address", "")),
            "placeId": p["place_id"],
            "lat": p["geometry"]["location"]["lat"],
            "lng": p["geometry"]["location"]["lng"],
            "rating": p.get("rating"),
            "ratingCount": p.get("user_ratings_total"),
        } for p in data.get("results", [])
            if p.get("business_status", "OPERATIONAL") == "OPERATIONAL"
            and re.search(pattern, p["name"], re.I)]
        units = [u for u in units if not any(same_shop(u, c) for c in picks)]
        units = with_times(loc, sorted(units, key=lambda u: meters(loc, u))[:8], key)
        if units:
            # Nearest first; between equally close units, the one with more reviews.
            picks.append(min(units, key=lambda u: (u["walkMin"], -(u["ratingCount"] or 0))))
    return picks


def category_places(loc, cat, key):
    limit = cat.get("limit", PER_CATEGORY)

    def walkable(places, max_walk=WALK_LIMIT):
        return [p for p in places if p["walkMin"] <= max_walk]

    patterns = [pattern for _, pattern in cat.get("chains", [])]

    def chain_of(p):
        return next((pt for pt in patterns if re.search(pt, p["name"], re.I)), None)

    def fill(chosen, candidates, allow_same_chain=False):
        # Prefer one unit per chain (a second Supermercados BH would hide another shop); a second unit of
        # the same chain only comes in at the very end (Buritis: nearly every pharmacy is an Araujo).
        for p in candidates:
            if len(chosen) >= limit:
                return
            if any(p["placeId"] == c["placeId"] for c in chosen):
                continue
            if not allow_same_chain and chain_of(p) and any(chain_of(c) == chain_of(p) for c in chosen):
                continue
            chosen.append(p)

    generic = walkable(with_times(loc, nearby(loc, cat, key)[:25], key), cat.get("max_walk", WALK_LIMIT))
    chosen = []
    if cat.get("chains"):
        chosen = walkable(chain_places(loc, cat, key))
        exc = cat.get("exception")
        if exc:
            chosen += [p for p in generic
                       if not any(re.search(pt, p["name"], re.I) for pt in patterns)
                       and (p["rating"] or 0) >= exc["min_rating"] and (p["ratingCount"] or 0) >= exc["min_reviews"]]
        chosen = sorted(chosen, key=lambda p: p["walkMin"])[:limit]
    fill(chosen, generic)  # what is left: the nearest places that passed the category's filters
    backup = []
    if len(chosen) < limit:
        relaxed = {**cat, "radius": max(cat["radius"], RELAX_RADIUS), "min_reviews": cat["min_reviews"] // 2}
        if cat.get("min_rating"):
            relaxed["min_rating"] = cat["min_rating"] - RELAX_RATING
        backup = walkable(with_times(loc, nearby(loc, relaxed, key)[:25], key))
        fill(chosen, backup)
    fill(chosen, sorted(generic + backup, key=lambda p: p["walkMin"]), allow_same_chain=True)
    return sorted(chosen, key=lambda p: p["walkMin"])


def hospital_places(loc, key):
    """The fixed hospitals, closest by car first (none of them is a walk away). No Google rating: hospital
    reviews are mostly about waiting times (2.6 to 4 for all of them) and don't reflect the ranking."""
    out = []
    for h in HOSPITALS:
        d = gmaps_get("place/details/json", {"place_id": h["placeId"], "fields": "geometry"}, key)
        g = d["result"]["geometry"]["location"]
        out.append({**h, "lat": g["lat"], "lng": g["lng"], "rating": None, "ratingCount": None})
    times = matrix(loc, [f"{h['lat']},{h['lng']}" for h in out], key)
    return sorted([{**h, **t} for h, t in zip(out, times)], key=lambda h: h.get("driveMin", 999))


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
        categories.append({"id": c["id"], "places": category_places(loc, c, key)})

    malls = []
    for m, t in zip(SHOPPING_MALLS, matrix(loc, [m["address"] for m in SHOPPING_MALLS], key)):
        if "walkMin" in t:
            g, _ = geocode(m["address"], key)
            malls.append({"name": m["name"], "address": m["address"], "placeId": None,
                          "lat": g["lat"], "lng": g["lng"], "rating": None, "ratingCount": None, **t})
    malls.sort(key=lambda p: p["walkMin"])
    # Malls go right after bakeries in the list.
    categories.insert(3, {"id": "mall", "places": malls})

    categories.append({"id": "hospital", "places": hospital_places(loc, key)})

    print(json.dumps({
        "origin": {"address": formatted, **loc},
        "skema": skema,
        "categories": categories,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
