#!/usr/bin/env python3
"""
BH tourist attractions — Chez Toi BH student app.

The list is curated (research of 2026-10-16). This script refreshes the facts from Google
(address, coordinates, rating, opening hours, website) and the distance from the demo apartment.
Descriptions and tips live in src/lib/attractions.ts.

Usage (from App CTBH/app):
    python3 scripts/attractions.py > src/data/attractions.json
"""

import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor

from nearby import gmaps_get, load_key, matrix
from photo_allowlist import write_allowlist
from restaurants import ORIGIN, details, neighborhood

# id, Google place id, index of the photo to show (0 = first; another one when the first is weak).
ATTRACTIONS = [
    ("pampulha-church", "ChIJy8jGrlWQpgARNFdAKqO_ehY", 0),
    ("pampulha-lagoa", "ChIJFTdn5U2QpgARQ_D45yct-4Q", 0),
    ("casa-do-baile", "ChIJlxqb2FqQpgARB0K6QJa63pQ", 2),
    ("mineirao", "ChIJbf9IE_eQpgARiHXSQjJFuTU", 2),
    ("mercado-central", "ChIJAz0eA-KZpgARYAFkjcWmbI4", 0),
    ("mercado-novo", "ChIJ8dj6IGmXpgAR-4SWbwxlVdY", 0),
    ("praca-liberdade", "ChIJjU6EM9yZpgAR-ZPzNIfuwyU", 0),
    ("ccbb", "ChIJ-y9fS9yZpgARW-N0ni10mlU", 0),
    ("mm-gerdau", "ChIJOzlj092ZpgAR-mL6VtTxMtY", 0),
    ("palacio-artes", "ChIJBzw2c8KZpgARY74EPRA9fUw", 0),
    ("parque-municipal", "ChIJ1VS5qu-ZpgARF8B4SNBoDQc", 0),
    ("mangabeiras", "ChIJ8wlHY66ZpgARJtyGadOpM-U", 0),
    ("serra-curral", "ChIJYYGyH1KYpgARXMqLukutIYA", 0),
    ("praca-papa", "ChIJEczse1KYpgARRu0mCO-2zQo", 0),
    ("feira-hippie", "ChIJyXh9ppCZpgAR-IYKBctMFRQ", 0),
    ("santa-tereza", "ChIJw0LqEieapgARPI4iyY2xzak", 3),
    ("estacao", "ChIJ2VZVHPqZpgARxfOC9NjNX8Q", 0),
]


def clean_address(address):
    """Google sometimes returns a CEP from another state (Mangabeiras: 47512-000); BH's start with 30 or 31."""
    address = address.replace(", Brazil", "").replace(", Brasil", "")
    return re.sub(r",\s*(?!3[01])\d{5}-\d{3}$", "", address)


def clean_website(url):
    """Santa Tereza came back as two URLs glued with ';%20': keep the first."""
    return url.split(";")[0].strip() if url else url


def main():
    key = load_key()
    origin = gmaps_get("geocode/json", {"address": ORIGIN, "region": "br"}, key)["results"][0]["geometry"]["location"]

    with ThreadPoolExecutor(6) as ex:
        fetched = list(ex.map(lambda a: (a, details(a[1], key)), ATTRACTIONS))

    points = [f"{d['geometry']['location']['lat']},{d['geometry']['location']['lng']}" for _, d in fetched]
    times = [t for i in range(0, len(points), 25) for t in matrix(origin, points[i:i + 25], key)]

    out = []
    for ((aid, place_id, photo_index), d), t in zip(fetched, times):
        loc = d["geometry"]["location"]
        out.append({
            "id": aid,
            "name": d["name"],
            "placeId": place_id,
            "photoIndex": photo_index,
            "address": clean_address(d.get("formatted_address", "")),
            "neighborhood": neighborhood(d.get("formatted_address", "")),
            "lat": loc["lat"],
            "lng": loc["lng"],
            "rating": d.get("rating"),
            "ratingCount": d.get("user_ratings_total"),
            "hours": [{"open": p["open"], "close": p.get("close")} for p in (d.get("opening_hours") or {}).get("periods", [])],
            "website": clean_website(d.get("website")),
            **t,
        })

    print(json.dumps({"origin": origin, "attractions": out}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
