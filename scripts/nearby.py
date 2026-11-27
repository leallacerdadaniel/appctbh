#!/usr/bin/env python3
"""
Nearby places for one apartment — Chez Toi BH student app.

Same approach as the `location-info` skill (Chez Toi BH/agents/operations/skills/location-info),
extended with more everyday categories, coordinates and place_id so the app can open directions.
Results are precomputed and bundled/stored, so the Google key never ships inside the app.

Usage (from App CTBH/app):
    python3 scripts/nearby.py "Rua X, 123 - Bairro, Belo Horizonte"   # one address, for checking
All the apartments: scripts/apartment_places.py.

Key: GOOGLE_MAPS_API_KEY from the environment, from this app's .env.local or ~/Desktop/Chez Toi BH/.env.
APIs used (27/11/2026): Places API (New) — searchNearby, searchText, Place Details — and Routes API
(computeRouteMatrix). The legacy Places / Distance Matrix endpoints can't be turned on in a new Google Cloud project
since March 2025, and the Chez Toi key lives in a new project. The results keep the shape the app reads.
"""

import json
import math
import os
import re
import sys
import urllib.error
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
     "exception": {"min_rating": 4.5, "min_reviews": 500},
     # Owner, 2026-11-05: online gyms have no place to go to (seen in Prado: Livel FITBOX).
     "exclude": r"\bonline\b|\bvirtual\b"},
    # Laundries (owner, 2026-10-19): quality first, then proximity — good rating, enough reviews, walkable.
    {"id": "laundry", "type": "laundry", "keyword": "lavanderia", "radius": 2000, "min_reviews": 50,
     "min_rating": 4.5, "max_walk": 15, "exclude": r"sof[aá]|tapete|estofad|cortina"},
]


PLACES_URL = "https://places.googleapis.com/v1/"
ROUTES_URL = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"
# What we read of a place (the Enterprise fields rating / userRatingCount / priceLevel are the point of the lists).
PLACE_FIELDS = ["id", "displayName", "formattedAddress", "shortFormattedAddress", "location", "rating",
                "userRatingCount", "businessStatus", "priceLevel"]
PRICE_LEVELS = {"PRICE_LEVEL_FREE": 0, "PRICE_LEVEL_INEXPENSIVE": 1, "PRICE_LEVEL_MODERATE": 2,
                "PRICE_LEVEL_EXPENSIVE": 3, "PRICE_LEVEL_VERY_EXPENSIVE": 4}
# Centre of BH, to bias text searches made without an apartment (one address, a mall).
BH_CENTER = {"lat": -19.9245, "lng": -43.9352}

# Top rated near the apartment (owner, 2026-11-09: "puxa os mais bem avaliados do Google nas proximidades do
# apto"), shown in Explorer with a tap to Google Maps. Google's star average alone favours tiny places (5.0 from
# 12 reviews), so the list is ranked by a weighted rating: the average pulled towards PRIOR_RATING by
# PRIOR_REVIEWS imaginary reviews. Only places within TOP_MAX_WALK minutes on foot.
TOP_RATED = [
    {"id": "restaurant", "type": "restaurant", "word": "restaurante", "radius": 1300, "min_reviews": 300, "min_rating": 4.5,
     # fast food is not what "best rated" means here
     "exclude": r"mc ?donald|burger king|subway|habib|\bbob'?s\b|giraffas|\bkfc\b|popeyes"},
    {"id": "bar", "type": "bar", "word": "bar", "radius": 1300, "min_reviews": 300, "min_rating": 4.4, "exclude": None},
    {"id": "cafe", "type": "cafe", "word": "café", "radius": 1300, "min_reviews": 150, "min_rating": 4.5, "exclude": None},
]
TOP_PER_CATEGORY = 6
TOP_MAX_WALK = 15
TOP_PAGES = 2  # pages of the text search (20 places each), on top of the 20 of searchNearby
PRIOR_RATING = 4.3
PRIOR_REVIEWS = 400


_cache = {}


def cached(name, fetch):
    """Fixed places don't move between apartments: look them up only once per run."""
    if name not in _cache:
        _cache[name] = fetch()
    return _cache[name]


def load_key():
    key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
    if key:
        return key
    # The site folder's .env, or this app's .env.local (both outside Git).
    here = os.path.dirname(os.path.abspath(__file__))
    for env in (os.path.join(here, "..", ".env.local"), os.path.expanduser("~/Desktop/Chez Toi BH/.env")):
        if os.path.exists(env):
            with open(env, encoding="utf-8") as f:
                for line in f:
                    k, _, v = line.strip().partition("=")
                    if k.strip() == "GOOGLE_MAPS_API_KEY" and v.strip():
                        return v.strip().strip('"').strip("'")
    sys.exit("ERROR: GOOGLE_MAPS_API_KEY not found (environment, .env.local or ~/Desktop/Chez Toi BH/.env)")


def google_call(endpoint, body, fields, key):
    """One call to Places (New) or Routes. `endpoint` is a Places path ("places:searchNearby", "places/<id>") or
    the Routes URL; `body` None means GET. Stops the run with Google's message on any error."""
    url = endpoint if endpoint.startswith("http") else PLACES_URL + endpoint
    headers = {"X-Goog-Api-Key": key, "X-Goog-FieldMask": ",".join(fields), "Content-Type": "application/json"}
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="GET" if body is None else "POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8") or "null")
    except urllib.error.HTTPError as e:
        sys.exit(f"ERROR: Google {endpoint.split('/')[-1]} — {e.code} {e.read().decode('utf-8', 'replace')[:400]}")


def legacy(p):
    """A Places (New) place in the shape the rest of this file (and the app's data) was written for."""
    loc = p.get("location") or {}
    return {
        "place_id": p["id"],
        "name": (p.get("displayName") or {}).get("text", ""),
        "vicinity": p.get("shortFormattedAddress") or p.get("formattedAddress", ""),
        "formatted_address": p.get("formattedAddress", ""),
        "geometry": {"location": {"lat": loc.get("latitude"), "lng": loc.get("longitude")}},
        "rating": p.get("rating"),
        "user_ratings_total": p.get("userRatingCount"),
        "business_status": p.get("businessStatus", "OPERATIONAL"),
        "price_level": PRICE_LEVELS.get(p.get("priceLevel")),
    }


def circle(loc, radius):
    return {"circle": {"center": {"latitude": loc["lat"], "longitude": loc["lng"]}, "radius": float(radius)}}


def search_nearby(loc, radius, place_type, key, rank="POPULARITY"):
    """Up to 20 places of one type inside the circle (searchNearby has no keyword and no next page)."""
    data = google_call("places:searchNearby", {
        "includedTypes": [place_type], "maxResultCount": 20, "rankPreference": rank,
        "languageCode": "pt-BR", "regionCode": "BR", "locationRestriction": circle(loc, radius),
    }, ["places." + f for f in PLACE_FIELDS], key)
    return [legacy(p) for p in (data or {}).get("places", [])]


def search_text(query, loc, radius, key, place_type=None, pages=1):
    """Text search biased to the circle (it may return places outside: callers filter by walking time)."""
    body = {"textQuery": query, "pageSize": 20, "languageCode": "pt-BR", "regionCode": "BR",
            "locationBias": circle(loc, radius)}
    if place_type:
        body["includedType"] = place_type
    out = []
    for _ in range(pages):
        data = google_call("places:searchText", body, ["places." + f for f in PLACE_FIELDS] + ["nextPageToken"], key) or {}
        out += [legacy(p) for p in data.get("places", [])]
        if not data.get("nextPageToken"):
            break
        body = {**body, "pageToken": data["nextPageToken"]}
    return out


def geocode(address, key):
    """An address (or a place name) to coordinates, with Places text search (no Geocoding API to turn on)."""
    found = search_text(address, BH_CENTER, 50000, key)
    if not found:
        sys.exit(f"ERROR: nothing found for {address!r}")
    g = found[0]
    return g["geometry"]["location"], g["formatted_address"]


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
    # The keyword search ("padaria") is a text search of that type around the apartment; quality-filtered categories
    # also search the type alone, which finds well-rated places whose listing doesn't use the word (a "padaria" that
    # calls itself a café). Each gives at most 20 places.
    results = {}
    if cat["keyword"]:
        found = search_text(cat["keyword"], loc, cat["radius"], key, cat["type"])
        results.update({p["place_id"]: p for p in found if meters(loc, p["geometry"]["location"]) <= cat["radius"] * 1.5})
    if not cat["keyword"] or cat.get("min_rating"):
        results.update({p["place_id"]: p for p in search_nearby(loc, cat["radius"], cat["type"], key)})
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


def as_place(p):
    return {
        "name": clean_name(p["name"]),
        "address": p.get("vicinity", ""),
        "placeId": p["place_id"],
        "lat": p["geometry"]["location"]["lat"],
        "lng": p["geometry"]["location"]["lng"],
        "rating": p.get("rating"),
        "ratingCount": p.get("user_ratings_total"),
    }


def weighted_rating(p):
    v = p["ratingCount"] or 0
    return (v * (p["rating"] or 0) + PRIOR_REVIEWS * PRIOR_RATING) / (v + PRIOR_REVIEWS)


def top_rated_places(loc, cat, key):
    # The 20 most popular places of the type in the circle, plus up to TOP_PAGES pages of a text search ("restaurante"),
    # instead of the two pages of the old Nearby Search.
    found = search_nearby(loc, cat["radius"], cat["type"], key)
    found += [p for p in search_text(cat["word"], loc, cat["radius"], key, cat["type"], TOP_PAGES)
              if meters(loc, p["geometry"]["location"]) <= cat["radius"] * 1.5]
    candidates = {}
    for p in found:
        if p.get("business_status", "OPERATIONAL") != "OPERATIONAL":
            continue
        if (p.get("user_ratings_total") or 0) < cat["min_reviews"] or (p.get("rating") or 0) < cat["min_rating"]:
            continue
        if cat["exclude"] and re.search(cat["exclude"], p["name"], re.I):
            continue
        candidates[p["place_id"]] = {**as_place(p), "priceLevel": p.get("price_level")}
    # Walking times only for the best ones (Distance Matrix is paid per place).
    best = sorted(candidates.values(), key=weighted_rating, reverse=True)[:TOP_PER_CATEGORY * 2]
    near = [p for p in with_times(loc, best, key) if p["walkMin"] <= TOP_MAX_WALK]
    return sorted(near, key=weighted_rating, reverse=True)[:TOP_PER_CATEGORY]


def top_rated(loc, key):
    return [{"id": c["id"], "places": top_rated_places(loc, c, key)} for c in TOP_RATED]


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
        found = search_text(query, loc, CHAIN_SEARCH_RADIUS, key, cat["type"])
        units = [{
            "name": clean_name(p["name"]),
            "address": short_address(p.get("formatted_address", "")),
            "placeId": p["place_id"],
            "lat": p["geometry"]["location"]["lat"],
            "lng": p["geometry"]["location"]["lng"],
            "rating": p.get("rating"),
            "ratingCount": p.get("user_ratings_total"),
        } for p in found
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
        g = cached(f"hospital {h['placeId']}", lambda: google_call(f"places/{h['placeId']}", None, ["location"], key)["location"])
        out.append({**h, "lat": g["latitude"], "lng": g["longitude"], "rating": None, "ratingCount": None})
    times = matrix(loc, [f"{h['lat']},{h['lng']}" for h in out], key, drive="all")
    return sorted([{**h, **t} for h, t in zip(out, times)], key=lambda h: h.get("driveMin", 999))


def waypoint(destination):
    """"lat,lng" or an address, as a Routes API waypoint."""
    m = re.fullmatch(r"\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*", destination)
    if m:
        return {"waypoint": {"location": {"latLng": {"latitude": float(m[1]), "longitude": float(m[2])}}}}
    return {"waypoint": {"address": destination}}


def matrix(loc, destinations, key, drive="far"):
    """Walking metres/minutes for each destination (lat,lng or address) and, with the Routes API, driving minutes:
    drive="far" only where the walk is over WALK_LIMIT (the app shows the car only then, src/lib/places.tsx),
    "all" for every destination (hospitals are sorted by it), "none" for candidates that are dropped unless walkable.
    Routes bills per element: 27/11/2026, 722 elements for one apartment with walk + drive everywhere."""
    out = [{} for _ in destinations]
    if not destinations:
        return out
    origin = {"waypoint": {"location": {"latLng": {"latitude": loc["lat"], "longitude": loc["lng"]}}}}
    for mode in ("WALK", "DRIVE"):
        idx = list(range(len(destinations)))
        if mode == "DRIVE":
            if drive == "none":
                break
            if drive == "far":
                idx = [i for i in idx if out[i].get("walkMin", WALK_LIMIT + 1) > WALK_LIMIT]
            if not idx:
                break
        body = {"origins": [origin], "destinations": [waypoint(destinations[i]) for i in idx], "travelMode": mode}
        if mode == "DRIVE":
            body["routingPreference"] = "TRAFFIC_UNAWARE"
        data = google_call(ROUTES_URL, body, ["originIndex", "destinationIndex", "distanceMeters", "duration", "condition"], key)
        for el in data or []:
            if el.get("condition") != "ROUTE_EXISTS" or "duration" not in el:
                continue
            i = idx[el.get("destinationIndex", 0)]
            mins = max(1, round(int(str(el["duration"]).rstrip("s")) / 60))
            if mode == "WALK":
                out[i]["distanceM"] = el.get("distanceMeters", 0)
                out[i]["walkMin"] = mins
            else:
                out[i]["driveMin"] = mins
    return out


def with_times(loc, places, key, drive="none"):
    """Candidates with their walking time (only walkable ones are kept, so no driving time by default)."""
    times = matrix(loc, [f"{p['lat']},{p['lng']}" for p in places], key, drive)
    merged = [{**p, **t} for p, t in zip(places, times) if "walkMin" in t]
    return sorted(merged, key=lambda p: p["walkMin"])


def around(loc, key):
    """SKEMA and the everyday places around one apartment."""
    skema = matrix(loc, [SKEMA_ADDRESS], key)[0]

    categories = []
    for c in CATEGORIES:
        categories.append({"id": c["id"], "places": category_places(loc, c, key)})

    malls = []
    for m, t in zip(SHOPPING_MALLS, matrix(loc, [m["address"] for m in SHOPPING_MALLS], key)):
        if "walkMin" in t:
            g = cached(f"mall {m['address']}", lambda: geocode(m["address"], key)[0])
            malls.append({"name": m["name"], "address": m["address"], "placeId": None,
                          "lat": g["lat"], "lng": g["lng"], "rating": None, "ratingCount": None, **t})
    malls.sort(key=lambda p: p["walkMin"])
    # Malls go right after bakeries in the list.
    categories.insert(3, {"id": "mall", "places": malls})

    categories.append({"id": "hospital", "places": hospital_places(loc, key)})
    return {"skema": skema, "categories": categories, "topRated": top_rated(loc, key)}


def main():
    args = sys.argv[1:]
    only_top = args[:1] == ["--top-rated"]
    if only_top:
        args = args[1:]
    if not args:
        sys.exit('Usage: python3 scripts/nearby.py [--top-rated] "Rua X, 123 - Bairro, Belo Horizonte" | "-19.93,-43.93"')
    key = load_key()
    text = " ".join(args)
    coords = re.fullmatch(r"\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*", text)
    if coords:
        loc, formatted = {"lat": float(coords[1]), "lng": float(coords[2])}, text.strip()
    else:
        loc, formatted = geocode(text, key)
    if only_top:
        print(json.dumps({"topRated": top_rated(loc, key)}, ensure_ascii=False, indent=2))
        return
    print(json.dumps({"origin": {"address": formatted, **loc}, **around(loc, key)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
