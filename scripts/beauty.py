#!/usr/bin/env python3
"""
Beauty & well-being — Chez Toi BH student app (places from the owner's list "Cabelo e salões de beleza",
2026-10-24).

Refreshes the facts from Google (address, coordinates, opening hours, phone, website) and the distance
from the demo apartment. Descriptions and tips live in src/lib/beauty.ts.

Usage (from App CTBH/app):
    python3 scripts/beauty.py > src/data/beauty.json
"""

import json
from concurrent.futures import ThreadPoolExecutor

from attractions import clean_address, clean_website
from nearby import gmaps_get, load_key, matrix
from restaurants import ORIGIN, details, neighborhood

# id, Google place id. Chains: one entry per unit.
PLACES = [
    # Hair
    ("blow-savassi", "ChIJ2RmS3geZpgARjXZ615YI-HM"),
    ("blow-belvedere", "ChIJVz9RbfiZpgARNq8o6g4Qcfw"),
    ("blow-buritis", "ChIJxa9dDLqXpgARoTh0LvsZj5g"),
    ("blonde-concept", "ChIJ3XTuOZeZpgARf46l1OL8Prk"),
    ("fast-escova-savassi", "ChIJ6UO-wY-ZpgAR1iyC4ChW7KI"),
    ("fast-escova-lourdes", "ChIJlUAD6umZpgARMEdknyNBKFs"),
    ("fast-escova-belvedere", "ChIJc2h6AGKZpgARhKFfRydCbp8"),
    # Barber (men)
    ("thiago-dias", "ChIJZxeKvGyZpgAReI5m1ul74Ao"),
    # Nails
    ("lu-duarte", "ChIJ28w39v-ZpgARQ_0Jq80rQqI"),
    ("up-esmalteria", "ChIJmzIDstuZpgARrhyZDS71-A0"),
    ("charmea", "ChIJhxiabtqZpgARfPPwlUxhudA"),
    # Brows and lashes
    ("flavia-costa", "ChIJ73o3TimZpgARU3egn-Abkvc"),
    ("fabi-archanjo", "ChIJn0odC3WZpgARp7WNqcaZYao"),
    # Hair removal
    ("depyl-savassi", "ChIJ0xO0_dmZpgARcpzk4zccK04"),
    ("depyl-sion", "ChIJuxVXMbWZpgAROlffxRdfSls"),
    # Spas and massages
    ("alecrim", "ChIJxx6-94-XpgARes4_UXcwViQ"),
    ("spa-lotus", "ChIJy4n7JNeZpgARcFBUft0lN10"),
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
            "status": d.get("business_status"),
            "address": clean_address(d.get("formatted_address", "")),
            "neighborhood": neighborhood(d.get("formatted_address", "")),
            "lat": loc["lat"],
            "lng": loc["lng"],
            "hours": [{"open": p["open"], "close": p.get("close")} for p in (d.get("opening_hours") or {}).get("periods", [])],
            "phone": d.get("international_phone_number"),
            "website": clean_website(d.get("website")),
            **t,
        })

    print(json.dumps({"origin": origin, "places": out}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
