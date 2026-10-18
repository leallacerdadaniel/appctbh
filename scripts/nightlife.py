#!/usr/bin/env python3
"""
Nightlife — Chez Toi BH student app (bars and clubs chosen by the owner, 2026-10-18).

Refreshes the facts from Google (address, coordinates, opening hours, website) and the distance
from the demo apartment. Descriptions, tips and party days live in src/lib/nightlife.ts.

Usage (from App CTBH/app):
    python3 scripts/nightlife.py > src/data/nightlife.json
"""

import json
from concurrent.futures import ThreadPoolExecutor

from attractions import clean_address, clean_website
from nearby import gmaps_get, load_key, matrix
from restaurants import ORIGIN, details, neighborhood

# id, Google place id.
PLACES = [
    ("redentor", "ChIJ7bVC4tmZpgARViK85gXU6OM"),
    ("berilo", "ChIJyZGPMK6ZpgARD3vpH1bNBHE"),
    ("moema", "ChIJF4WU-iyZpgARIPSmd41qKaw"),
    ("estacao-savassi", "ChIJfZIURGuZpgARA4RT07XXkq4"),
    ("mercado-novo", "ChIJ8dj6IGmXpgAR-4SWbwxlVdY"),
    ("lab", "ChIJ5SH6_rOZpgARgv-J4IeBREE"),
    ("major-lock", "ChIJlUa7XtKZpgARby3Sb1jv-N8"),
    ("night-market", "ChIJM_zceu-XpgARkfDo0DCceHA"),
    ("raro", "ChIJ48Gy4dm9pgARfHBg-PBbZ_I"),
    ("chalezinho", "ChIJIQQx5eeWpgARjQkspqYs58k"),
]


def main():
    key = load_key()
    origin = gmaps_get("geocode/json", {"address": ORIGIN, "region": "br"}, key)["results"][0]["geometry"]["location"]

    with ThreadPoolExecutor(6) as ex:
        fetched = list(ex.map(lambda p: (p, details(p[1], key)), PLACES))

    points = [f"{d['geometry']['location']['lat']},{d['geometry']['location']['lng']}" for _, d in fetched]
    times = matrix(origin, points, key)

    out = []
    for ((pid, place_id), d), t in zip(fetched, times):
        loc = d["geometry"]["location"]
        out.append({
            "id": pid,
            "name": d["name"],
            "placeId": place_id,
            "address": clean_address(d.get("formatted_address", "")),
            "neighborhood": neighborhood(d.get("formatted_address", "")),
            "lat": loc["lat"],
            "lng": loc["lng"],
            "hours": [{"open": p["open"], "close": p.get("close")} for p in (d.get("opening_hours") or {}).get("periods", [])],
            "website": clean_website(d.get("website")),
            **t,
        })

    print(json.dumps({"origin": origin, "places": out}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
