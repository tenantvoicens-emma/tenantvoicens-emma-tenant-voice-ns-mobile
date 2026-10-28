"""Build the list of rental buildings to import from the HRM Residential
Rental Registry, with names from OpenStreetMap where one matches.

Usage (from the repository root):
    python3 tenant-voice-ns-mobile/scripts/registry-import/build.py

Reads:
    .github/agents/Residential_Rental_Registry_*.csv   (HRM open data)
    tenant-voice-ns-mobile/scripts/registry-import/osm-named-buildings.geojson
        (overpass turbo export of named buildings in HRM; ODbL)

Writes, next to this script:
    buildings.json   one entry per building to import
    report.txt       what was kept, skipped and matched, for review

Only buildings with 4 or more registered units are kept. Houses, duplexes
and room-by-room rentals are skipped: with so few tenants, a review would
identify its writer to the landlord.
"""

import csv
import glob
import json
import math
import re
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]

KEEP_BUILDING_TYPES = {
    "APARTMENT BUILDING",
    "MULTI-UNIT BUILDING (4 UNITS OR MORE)",
    "TOWN HOUSE / ROW HOUSE",
    "OTHER",
}
MIN_UNITS = 4

# OpenStreetMap building types a home can plausibly be in. Names on shops,
# schools, churches and offices are left out even if the address matches.
RESIDENTIAL_OSM_TYPES = {
    "apartments", "residential", "yes", "dormitory", "terrace", "house",
    "detached", "semidetached_house", "mixed_use",
}
# How close (metres) a nameless-address OSM building must be to count.
NEARBY_METRES = 35

SUFFIXES = {
    "ST": "STREET", "RD": "ROAD", "DR": "DRIVE", "AVE": "AVENUE",
    "AV": "AVENUE", "BLVD": "BOULEVARD", "LN": "LANE", "CRT": "COURT",
    "CT": "COURT", "CRES": "CRESCENT", "CR": "CRESCENT", "PL": "PLACE",
    "TERR": "TERRACE", "TER": "TERRACE", "HWY": "HIGHWAY", "PKWY": "PARKWAY",
    "CRCL": "CIRCLE", "CIR": "CIRCLE",
}
SMALL_WORDS = {"of", "the", "and", "de", "la"}


def normalize_street(street: str) -> str:
    street = re.sub(r"\s+(?:UNIT|APT|SUITE)\s*#?\s*\S+$", "", street.upper()).strip(" -")
    words = re.sub(r"[.,#]", " ", street).split()
    words = [word.strip("-") for word in words if word.strip("-")]
    if words:
        words[-1] = SUFFIXES.get(words[-1], words[-1])
    return " ".join(words)


def title_case(text: str) -> str:
    out = []
    for i, word in enumerate(text.lower().split()):
        if i > 0 and word in SMALL_WORDS:
            out.append(word)
        elif "'" in word:
            out.append(word[0].upper() + word[1:])
        else:
            out.append("-".join(part.capitalize() for part in word.split("-")))
    return " ".join(out)


CITY_FIXES = {
    "DARMOUTH": "DARTMOUTH", "DARTOUTH": "DARTMOUTH", "HALFIAX": "HALIFAX",
    "LOWER SACKVILE": "LOWER SACKVILLE", "LOWER SACLVILLE": "LOWER SACKVILLE",
    "HERRING COVE- HALIFAX": "HERRING COVE",
}
# 'UNIT 1003- ', 'UNIT # 704 - ', 'SUITE 210- ', '#711- ', 'LL18-', 'B-'
UNIT_PREFIX = re.compile(
    r"^(?:(?:(?:UNIT|SUITE|APT|APARTMENT)\.?\s*#?\s*|#\s*)[\dA-Z]+\s*-?\s*|[A-Z]{1,2}\d*-(?=\d))"
)
# Street numbers, including ranges and letters: '38-40', '714-B', '5231A-C'.
STREET_LINE = re.compile(
    r"^(\d[\dA-Z.]*(?:\s*[-/&]\s*(?:\d[\dA-Z.]*|[A-Z](?=[\s/&-])))*)[-/&]?\s+(.+)$"
)


def clean_city(city: str) -> str:
    # Only drop a province written as its own word: 'HALIFAX- NS', not the
    # end of 'HAMMONDS PLAINS'.
    city = re.sub(r"[\s-]+(NOVA SCOTIA|N\.?S\.?)$", "", city.upper().strip(" -"))
    city = city.strip(" -")
    return CITY_FIXES.get(city, city)


def split_address(raw: str):
    """'UNIT 1003- 5959 SPRING GARDEN RD,HALIFAX,B3H1Y5' ->
    ('5959', '5959', 'SPRING GARDEN ROAD', 'HALIFAX', 'B3H 1Y5')

    Most addresses are 'street,city,postal', but some carry an extra unit
    or suite part, so the city is taken as the part before the postal code
    and the street as the part that starts with a street number."""
    parts = [p.strip(" -\t") for p in raw.upper().split(",") if p.strip(" -\t")]
    postal = re.sub(r"[\s-]", "", parts[-1]) if parts else ""
    # Postal codes are sometimes typed with a hyphen, cut short, or with
    # the letter O for a zero.
    if re.fullmatch(r"[A-Z][0-9O][A-Z](?:[0-9O][A-Z][0-9A-Z])?", postal):
        parts = parts[:-1]
        if len(postal) == 6:
            fixed = postal[0] + postal[1].replace("O", "0") + postal[2] + postal[3].replace("O", "0") + postal[4] + postal[5].replace("O", "0").replace("I", "1")
            postal = f"{fixed[:3]} {fixed[3:]}" if fixed[5].isdigit() else ""
        else:
            postal = ""
    else:
        postal = ""
    while parts and re.fullmatch(r"NOVA SCOTIA|N\.?S\.?|CANADA", parts[-1]):
        parts = parts[:-1]
    if len(parts) < 2:
        return None
    city = clean_city(parts[-1])
    if not city or re.match(r"\d", city):
        return None
    for part in parts[:-1]:
        match = STREET_LINE.match(UNIT_PREFIX.sub("", part))
        if match:
            break
    else:
        return None
    number_text = re.sub(r"\s+", "", match.group(1)).strip("-/&")
    # '102-5633' is unit 102 at number 5633; '1-15' or '1097-1101' is a
    # range of street numbers.
    unit_civic = re.fullmatch(r"(\d+)-(\d+)", number_text)
    if unit_civic and int(unit_civic.group(1)) >= 100 and int(unit_civic.group(2)) > 10 * int(unit_civic.group(1)):
        number_text = unit_civic.group(2)
    first_number = re.match(r"\d+", number_text).group(0)
    return number_text, first_number, normalize_street(match.group(2)), city, postal


def mercator_to_lat_lon(x: float, y: float):
    lon = math.degrees(x / 6378137.0)
    lat = math.degrees(2 * math.atan(math.exp(y / 6378137.0)) - math.pi / 2)
    return lat, lon


def metres_between(a, b):
    lat = math.radians((a[0] + b[0]) / 2)
    dy = (a[0] - b[0]) * 111_320
    dx = (a[1] - b[1]) * 111_320 * math.cos(lat)
    return math.hypot(dx, dy)


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def main():
    registry_path = sorted(glob.glob(str(REPO / ".github/agents/Residential_Rental_Registry_*.csv")))[-1]
    rows = list(csv.DictReader(open(registry_path, encoding="utf-8-sig")))
    report = [f"Registry: {Path(registry_path).name}, {len(rows)} registrations"]

    # Group registrations into buildings by street number + street + city.
    buildings = {}
    unparsed = []
    for row in rows:
        parsed = split_address(row["Address"])
        if not parsed:
            unparsed.append(row["Address"])
            continue
        number_text, first_number, street, city, postal = parsed
        key = (first_number, street, city)
        building = buildings.setdefault(key, {
            "number": number_text, "street": street, "city": city,
            "postal": postal, "units": 0, "types": set(), "unit_types": set(),
            "points": [],
        })
        try:
            building["units"] += int(row["Registered Units"] or 0)
        except ValueError:
            pass
        building["types"].add(row["Building Type"].strip())
        building["unit_types"].update(t.strip() for t in row["Rental Unit Type"].split(","))
        building["postal"] = building["postal"] or postal
        try:
            building["points"].append(mercator_to_lat_lon(float(row["x"]), float(row["y"])))
        except ValueError:
            pass

    kept = []
    skipped = defaultdict(int)
    for building in buildings.values():
        if building["units"] < MIN_UNITS:
            skipped["fewer than 4 units"] += 1
        elif not building["types"] & KEEP_BUILDING_TYPES:
            skipped["house, duplex or small building"] += 1
        elif building["unit_types"] <= {"BEDROOM ONLY", "OTHER"}:
            skipped["rented by the room"] += 1
        else:
            kept.append(building)
    report.append(f"Buildings: {len(buildings)}; kept {len(kept)}; skipped {dict(skipped)}")
    report.append(f"Unparseable addresses: {len(unparsed)} {unparsed[:10]}")

    # OpenStreetMap names, by address and by location.
    osm = json.load(open(HERE / "osm-named-buildings.geojson"))["features"]
    by_address = defaultdict(list)
    nameless_address = []
    for feature in osm:
        props = feature["properties"]
        if props.get("building") not in RESIDENTIAL_OSM_TYPES or not props.get("name"):
            continue
        lon, lat = feature["geometry"]["coordinates"][:2]
        entry = {"name": props["name"].strip(" ,;"), "id": props.get("@id") or feature.get("id"), "point": (lat, lon)}
        number = re.match(r"\d+", props.get("addr:housenumber", "") or "")
        if number and props.get("addr:street"):
            by_address[(number.group(0), normalize_street(props["addr:street"]))].append(entry)
        else:
            nameless_address.append(entry)

    matched_address = matched_nearby = 0
    for building in kept:
        candidates = by_address.get((re.match(r"\d+", building["number"]).group(0), building["street"]), [])
        names = {c["name"] for c in candidates}
        if len(names) == 1:
            building["osm"] = candidates[0]
            matched_address += 1
            continue
        if building["points"] and not candidates:
            point = building["points"][0]
            near = [c for c in nameless_address if metres_between(point, c["point"]) <= NEARBY_METRES]
            if len({c["name"] for c in near}) == 1:
                building["osm"] = near[0]
                building["osm_nearby"] = True
                matched_nearby += 1
    report.append(f"OSM names matched: {matched_address} by address, {matched_nearby} by location")

    output = []
    used_slugs = set()
    for building in sorted(kept, key=lambda b: (b["city"], b["street"], int(re.match(r"\d+", b["number"]).group(0)))):
        address = f"{building['number']} {title_case(building['street'])}"
        city = title_case(building["city"])
        name = building["osm"]["name"] if "osm" in building else address
        slug = base = slugify(f"{address} {city}")
        suffix = 2
        while slug in used_slugs:
            slug = f"{base}-{suffix}"
            suffix += 1
        used_slugs.add(slug)
        output.append({
            "slug": slug, "name": name, "address": address, "city": city,
            "postal_code": building["postal"] or None,
            "registered_units": building["units"],
            "osm_id": building["osm"]["id"] if "osm" in building else None,
        })
        if "osm" in building:
            how = "nearby" if building.get("osm_nearby") else "address"
            report.append(f"  name [{how}] {name!r} -> {address}, {city}")

    json.dump(output, open(HERE / "buildings.json", "w"), indent=0, ensure_ascii=False)
    (HERE / "report.txt").write_text("\n".join(report) + "\n")
    print("\n".join(report[:4]))
    print(f"Wrote {len(output)} buildings")


if __name__ == "__main__":
    main()
