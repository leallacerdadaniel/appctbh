#!/usr/bin/env python3
"""
Recommended restaurants — Chez Toi BH student app.

The list below is curated by hand (team picks, Casual EXAME Top 100 2026, cross-checked on Google:
open, rating >= 4.5 with hundreds of reviews). This script only refreshes the facts from Google
(address, coordinates, rating, price level, opening hours, phone, website) and the distance from
the demo apartment. Descriptions live in src/lib/restaurants.ts, written by the team.

Usage (from App CTBH/app):
    python3 scripts/restaurants.py > src/data/restaurants.json
    python3 scripts/restaurants.py --reviews reviews.json   # also dump reviews, to help write descriptions

Key: same as scripts/nearby.py.
"""

import json
import os
import sys
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

from nearby import gmaps_get, load_key, matrix
from photo_allowlist import write_allowlist

ORIGIN = "Rua Antônio de Albuquerque, 335 - Funcionários, Belo Horizonte - MG"

# id, Google search query, tier ("occasion" | "everyday"), Casual EXAME Top 100 Brasil 2026 position.
RESTAURANTS = [
    ("glouton", "Glouton Rua Bárbara Heliodora Lourdes", "occasion", 24),
    ("parallel", "Parallel Rua Santa Catarina 1155 Lourdes", "occasion", 32),
    ("pacato", "Pacato Rua Rio de Janeiro Lourdes", "occasion", 35),
    ("trintaeum", "Trintaeum Lourdes Belo Horizonte", "occasion", 20),
    ("per-lui", "Per Lui Restaurante Serra Belo Horizonte", "occasion", 47),
    ("birosca", "Birosca Restaurante Rua São Paulo Lourdes", "occasion", 36),
    ("anella", "Anella Ristorante Belo Horizonte", "occasion", None),
    ("okinaki", "Ōkinaki Lourdes Belo Horizonte", "occasion", None),
    ("nino", "Nino Cucina Lourdes Belo Horizonte", "occasion", None),
    ("maru", "Marú Bar Japonês Savassi", "occasion", None),
    ("osso", "OssO Rua São Paulo Lourdes", "occasion", None),
    ("villeon", "Villeon Restaurante Luxemburgo", "occasion", None),
    ("patria", "Pátria Cozinha do Brasil Belvedere", "occasion", None),
    ("rex-bibendi", "Rex Bibendi Funcionários Belo Horizonte", "occasion", None),
    ("est-est-est", "Est! Est!! Est!!! Ristorante Savassi", "occasion", None),
    ("barolio", "Barolio Savassi Belo Horizonte", "occasion", None),
    ("amado", "Restaurante Amado Lourdes", "occasion", None),
    ("casa-calixto", "Casa Calixto Savassi Belo Horizonte", "occasion", None),
    ("el-mai", "el Mai Lourdes Belo Horizonte", "occasion", None),
    ("ninita", "Ninita Cozinha Lourdes Belo Horizonte", "occasion", None),
    ("domenico", "Domenico Pizzeria Trattoria Savassi", "occasion", None),
    ("cozinha-tupis", "Cozinha Tupis Mercado Novo Belo Horizonte", "everyday", 26),
    ("bar-da-lora", "Bar da Lora Savassi", "everyday", None),
    ("gastro-hub", "Gastrô Hub Serra Belo Horizonte", "everyday", None),
    ("odoya", "Odoya Savassi Belo Horizonte", "everyday", None),
    ("dona-fulo", "Dona Fulô Lourdes Belo Horizonte", "everyday", None),
    ("hou-mei", "Hou Mei Lourdes Belo Horizonte", "everyday", None),
    ("stadt-jever", "Stadt Jever Funcionários Belo Horizonte", "everyday", None),
    ("esquina-sante", "Esquina Santê Santa Tereza Belo Horizonte", "everyday", None),
    ("james-burger", "James Burger Savassi", "everyday", None),
    ("maurizio-gallo", "Maurízio Gallo Lourdes Belo Horizonte", "everyday", None),
    ("indian-gourmet", "Indian Gourmet Lourdes Belo Horizonte", "everyday", None),
    ("candia", "O Candiá Bar Prado Belo Horizonte", "everyday", None),
    ("baxo-bar", "Baxo Bar Funcionários Belo Horizonte", "everyday", None),
]

DETAIL_FIELDS = ",".join([
    "place_id", "name", "formatted_address", "geometry", "rating", "user_ratings_total",
    "price_level", "opening_hours", "website", "international_phone_number", "url",
    "business_status", "editorial_summary", "reviews",
])


def neighborhood(address):
    """"R. Sergipe, 1414 - Savassi, Belo Horizonte - MG, …" → "Savassi"."""
    head = address.split(", Belo Horizonte")[0]
    return head.split(" - ")[-1].strip() if " - " in head else ""


def find(query, key):
    data = gmaps_get("place/textsearch/json", {"query": f"{query}", "region": "br", "language": "pt-BR"}, key)
    results = data.get("results") or []
    if not results:
        sys.exit(f"ERROR: nothing found for {query!r}")
    return results[0]["place_id"]


def details(place_id, key):
    data = gmaps_get("place/details/json", {
        "place_id": place_id, "fields": DETAIL_FIELDS, "language": "pt-BR", "reviews_sort": "most_relevant",
    }, key)
    if data.get("status") != "OK":
        sys.exit(f"ERROR: details failed for {place_id} — {data.get('status')}")
    return data["result"]


def main():
    key = load_key()
    reviews_out = sys.argv[sys.argv.index("--reviews") + 1] if "--reviews" in sys.argv else None

    origin = gmaps_get("geocode/json", {"address": ORIGIN, "region": "br"}, key)["results"][0]["geometry"]["location"]

    def fetch(entry):
        rid, query, tier, top100 = entry
        return entry, details(find(query, key), key)

    with ThreadPoolExecutor(6) as ex:
        fetched = list(ex.map(fetch, RESTAURANTS))

    points = [f"{d['geometry']['location']['lat']},{d['geometry']['location']['lng']}" for _, d in fetched]
    # Distance Matrix takes at most 25 destinations per call.
    times = [t for i in range(0, len(points), 25) for t in matrix(origin, points[i:i + 25], key)]

    restaurants, reviews = [], {}
    for ((rid, _, tier, top100), d), t in zip(fetched, times):
        if d.get("business_status") != "OPERATIONAL":
            print(f"WARNING: {rid} is {d.get('business_status')}", file=sys.stderr)
        loc = d["geometry"]["location"]
        restaurants.append({
            "id": rid,
            "name": d["name"],
            "tier": tier,
            "top100": top100,
            "address": d.get("formatted_address", "").replace(", Brazil", "").replace(", Brasil", ""),
            "neighborhood": neighborhood(d.get("formatted_address", "")),
            "lat": loc["lat"],
            "lng": loc["lng"],
            "placeId": d["place_id"],
            "rating": d.get("rating"),
            "ratingCount": d.get("user_ratings_total"),
            "priceLevel": d.get("price_level"),
            # Google periods: day 0 = Sunday, times "HHMM". Formatted per language in the app.
            "hours": [
                {"open": p["open"], "close": p.get("close")}
                for p in (d.get("opening_hours") or {}).get("periods", [])
            ],
            "phone": d.get("international_phone_number"),
            "website": d.get("website"),
            **t,
        })
        reviews[rid] = {
            "name": d["name"],
            "summary": (d.get("editorial_summary") or {}).get("overview"),
            "reviews": [r.get("text", "")[:600] for r in d.get("reviews", [])],
        }

    print(json.dumps({"origin": origin, "restaurants": restaurants}, ensure_ascii=False, indent=2))
    write_allowlist()
    if reviews_out:
        with open(reviews_out, "w", encoding="utf-8") as f:
            json.dump(reviews, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
