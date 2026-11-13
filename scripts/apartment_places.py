#!/usr/bin/env python3
"""
Places and distances for every apartment with a student contract in the app's access period.

For each apartment, from its coordinates on the site:
  - the "À proximité" list and the time to SKEMA (same rules as nearby.py);
  - walking distance, walking time and driving time to every curated place of the app.
The result goes to `app_apartment_places`. An apartment already there is skipped, so a run that stops
halfway can simply be started again without paying twice; use --force to recompute.

Usage (from App CTBH/app):
    python3 scripts/apartment_places.py --list              # apartments, no Google calls
    python3 scripts/apartment_places.py --only "Apto Teste" # one contract, prints the calls it used
    python3 scripts/apartment_places.py                     # all the others
    python3 scripts/apartment_places.py --top-rated         # only "les mieux notés" for apartments already saved

Keys: SUPABASE_SECRET_KEY and EXPO_PUBLIC_SUPABASE_URL from .env.local; Google key as in nearby.py.
"""

import argparse
import collections
import json
import os
import sys
import urllib.parse
import urllib.request

import nearby as google

CURATED = [
    ("attractions", "attractions"),
    ("beauty", "places"),
    ("nightlife", "places"),
    ("restaurants", "restaurants"),
    ("sports", "places"),
]
MATRIX_BATCH = 25  # Distance Matrix limit per call

here = os.path.dirname(os.path.abspath(__file__))
calls = collections.Counter()


def count_calls():
    """Calls per Google endpoint, to measure the real cost on the first apartment."""
    real = google.gmaps_get

    def counted(endpoint, params, key):
        calls[endpoint] += 1
        if endpoint.startswith("distancematrix"):
            calls["matrix elements"] += len(params["destinations"].split("|"))
        return real(endpoint, params, key)

    google.gmaps_get = counted


def load_env():
    env = {}
    with open(os.path.join(here, "..", ".env.local"), encoding="utf-8") as f:
        for line in f:
            k, _, v = line.strip().partition("=")
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env["EXPO_PUBLIC_SUPABASE_URL"], env["SUPABASE_SECRET_KEY"]


def rest(url, key, path, body=None, prefer=None):
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    if prefer:
        headers["Prefer"] = prefer
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(f"{url}/rest/v1/{path}", data=data, headers=headers, method="POST" if data else "GET")
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8")
    return json.loads(raw) if raw else None


def apartments(url, key):
    """The same contracts the admin lists: active, in the access period, not excluded."""
    cfg = rest(url, key, "app_settings?select=access_start,access_end,excluded_rental_ids")[0]
    query = urllib.parse.urlencode({
        "select": "id,nickname,apartment_id,apartments(title,location,latitude,longitude)",
        "status": "eq.active",
        "start_date": f"lte.{cfg['access_end']}",
        "end_date": f"gte.{cfg['access_start']}",
    })
    out = {}
    for r in rest(url, key, f"apartment_rentals?{query}"):
        if r["id"] in cfg["excluded_rental_ids"] or not r["apartment_id"]:
            continue
        a = r["apartments"]
        entry = out.setdefault(r["apartment_id"], {"id": r["apartment_id"], "address": a["location"],
                                                   "lat": a["latitude"], "lng": a["longitude"], "contracts": []})
        entry["contracts"].append(r["nickname"] or a["title"])
    return list(out.values())


def curated_places():
    """Every curated place once (a few are in two lists)."""
    places = {}
    for name, field in CURATED:
        with open(os.path.join(here, "..", "src", "data", f"{name}.json"), encoding="utf-8") as f:
            for p in json.load(f)[field]:
                places[p["placeId"]] = f"{p['lat']},{p['lng']}"
    return places


def curated_times(loc, places, key):
    ids = list(places)
    times = {}
    for i in range(0, len(ids), MATRIX_BATCH):
        batch = ids[i:i + MATRIX_BATCH]
        times.update(zip(batch, google.matrix(loc, [places[p] for p in batch], key)))
    return times


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--list", action="store_true", help="show the apartments and stop")
    parser.add_argument("--only", help="only contracts whose name contains this text")
    parser.add_argument("--force", action="store_true", help="recompute apartments already saved")
    parser.add_argument("--top-rated", action="store_true",
                        help="only add the top-rated restaurants, bars and cafés (2026-11-09) to saved apartments")
    args = parser.parse_args()

    url, secret = load_env()
    todo = apartments(url, secret)
    if args.only:
        todo = [a for a in todo if any(args.only.lower() in c.lower() for c in a["contracts"])]
    saved = {r["apartment_id"]: r for r in rest(url, secret, "app_apartment_places?select=apartment_id,nearby,times")}
    done = set(saved)
    if args.top_rated:
        # Only the new lists: the rest of the row stays as it is (no need to pay for it again).
        done = {i for i, r in saved.items() if "topRated" in (r["nearby"] or {})}

    missing = [a for a in todo if not (a["lat"] and a["lng"])]
    for a in missing:
        print(f"SEM COORDENADAS, fica de fora: {', '.join(a['contracts'])}", file=sys.stderr)
    todo = [a for a in todo if a["lat"] and a["lng"]]

    if args.list:
        for a in todo:
            print(f"{'pronto  ' if a['id'] in done else 'pendente'} {a['address']} ({', '.join(a['contracts'])})")
        print(f"{len(todo)} apartamentos, {sum(a['id'] not in done for a in todo)} pendentes")
        return

    count_calls()
    key = google.load_key()
    places = curated_places()
    for n, a in enumerate(todo, 1):
        name = ", ".join(a["contracts"])
        if a["id"] in done and not args.force:
            print(f"[{n}/{len(todo)}] já pronto: {name}")
            continue
        loc = {"lat": a["lat"], "lng": a["lng"]}
        if args.top_rated and a["id"] in saved:
            row = {**saved[a["id"]], "nearby": {**saved[a["id"]]["nearby"], "topRated": google.top_rated(loc, key)}}
        else:
            row = {
                "apartment_id": a["id"],
                "nearby": google.around(loc, key),
                "times": curated_times(loc, places, key),
            }
        rest(url, secret, "app_apartment_places?on_conflict=apartment_id", [row], "resolution=merge-duplicates")
        print(f"[{n}/{len(todo)}] salvo: {name}")
        print(f"    chamadas até agora: {dict(calls)}")


if __name__ == "__main__":
    main()
