import csv
import json

WEIGHTS = {
    "docker": 20,
    "http": 20,
    "tcp": 15,
    "slack": 15,
    "status_page": 10,
    "config_as_code": 20,
}

QUALIFYING_KEYS = ["docker", "http", "tcp", "slack"]
EXPECTED_COLUMNS = [
    "product", "docker", "http", "tcp", "slack", "status_page",
    "config_as_code", "license", "latest_release", "release_date",
    "score", "source_urls"
]

results = {
    "validation_passed": True,
    "products": {},
    "qualifying_products": [],
    "recommended_product": None
}

with open('/workspace/candidates.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    if reader.fieldnames != EXPECTED_COLUMNS:
        results["validation_passed"] = False
        results["error"] = f"Columns mismatch: {reader.fieldnames} != {EXPECTED_COLUMNS}"
    
    rows = list(reader)
    if len(rows) != 3:
        results["validation_passed"] = False
        results["error"] = f"Expected 3 rows, got {len(rows)}"

    highest_score = -1
    for row in rows:
        prod = row["product"]
        recomputed_score = 0
        for feature, weight in WEIGHTS.items():
            if row.get(feature) == "yes":
                recomputed_score += weight
        
        csv_score = int(row.get("score", -1))
        score_matches = (recomputed_score == csv_score)
        if not score_matches:
            results["validation_passed"] = False

        is_qualifying = all(row.get(k) == "yes" for k in QUALIFYING_KEYS)
        if is_qualifying:
            results["qualifying_products"].append(prod)
            if recomputed_score > highest_score:
                highest_score = recomputed_score
                results["recommended_product"] = prod

        results["products"][prod] = {
            "csv_score": csv_score,
            "recomputed_score": recomputed_score,
            "score_matches": score_matches,
            "qualifying": is_qualifying,
            "license": row.get("license"),
            "latest_release": row.get("latest_release"),
            "release_date": row.get("release_date"),
            "sources": row.get("source_urls", "").split(";")
        }

with open('/workspace/score-check.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)

print(json.dumps(results, indent=2))
