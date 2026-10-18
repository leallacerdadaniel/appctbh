#!/usr/bin/env python3
"""
Sports — Chez Toi BH student app (places chosen with the owner, research 2026-10-18).

Refreshes the facts from Google (address, coordinates, opening hours, website) and the distance
from the demo apartment. Descriptions, prices and tips live in src/lib/sports.ts.

Usage (from App CTBH/app):
    python3 scripts/sports.py > src/data/sports.json
"""

import json
from concurrent.futures import ThreadPoolExecutor

from attractions import clean_address, clean_website
from nearby import gmaps_get, load_key, matrix
from restaurants import ORIGIN, details, neighborhood

# id, Google place id.
PLACES = [
    # Running
    ("run-pampulha", "ChIJFTdn5U2QpgARQ_D45yct-4Q"),
    ("run-liberdade", "ChIJjU6EM9yZpgAR-ZPzNIfuwyU"),
    ("run-lagoa-seca", "ChIJc9Z60feXpgARoLhSNOaxHx8"),
    ("run-parque-municipal", "ChIJ1VS5qu-ZpgARF8B4SNBoDQc"),
    ("run-mangabeiras", "ChIJCdNRlXOZpgAREwvpLa2Lnpc"),
    # Gym chains (unit closest to the apartment)
    ("smart-fit", "ChIJOVrhO7tRzpQR0BRxxSb1IUE"),
    ("bluefit", "ChIJSVkAvTCZpgARPt7TXM1n-OE"),
    ("contorno-do-corpo", "ChIJI82dK5WZpgARtVFjqodjJUs"),
    ("pratique", "ChIJBSc5YDSZpgARd8YaK4GPqWo"),
    # Sports
    ("bh-wake-school", "ChIJ4c-kk5OxpgARFCxyG6IAJps"),
    ("pe-na-areia", "ChIJhSOWtnCZpgARwdUNqhxGmtg"),
    ("orla-sports", "ChIJUepP212ZpgARyYRo3DsK8l8"),
    ("4set-arena", "ChIJr1rgEU-XpgARCGbpEkRSRRU"),
    ("arena-serra", "ChIJ0SqWPL2ZpgARI29kXlKvXjc"),
    ("la-bombonera", "ChIJuy5jK--XpgAReN6UYz0zuYY"),
    ("arena-7-bh", "ChIJU5CLPkyRpgARz1d-PFDk2wA"),
    ("layback-park", "ChIJ00rxsXW9pgARDowg6df3o98"),
    ("fast-tennis", "ChIJFTVeF8iZpgARWClBvmSg_74"),
    ("aera-pilates", "ChIJP34dPWeZpgAR-8sb_JvvadQ"),
    ("goya", "ChIJM3CRaACXpgARM_dKVrp-Dv4"),
    ("flow-yoga", "ChIJ7frYpXeZpgARoxkYN4YoaRE"),
    ("vidya", "ChIJFc4AqCGZpgARn3oBxy3VPlM"),
    ("velocity", "ChIJmwMT0v2ZpgARGiTs-Ie2gSQ"),
    ("companhia-do-nado", "ChIJYxInvsmZpgARhbenLkqWjI4"),
    ("gracie-barra", "ChIJ0dTdFDOZpgARQL2wPkJNozI"),
]


def main():
    key = load_key()
    origin = gmaps_get("geocode/json", {"address": ORIGIN, "region": "br"}, key)["results"][0]["geometry"]["location"]

    with ThreadPoolExecutor(6) as ex:
        fetched = list(ex.map(lambda p: (p, details(p[1], key)), PLACES))

    points = [f"{d['geometry']['location']['lat']},{d['geometry']['location']['lng']}" for _, d in fetched]
    # Distance Matrix takes at most 25 destinations per call.
    times = [t for i in range(0, len(points), 25) for t in matrix(origin, points[i:i + 25], key)]

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
