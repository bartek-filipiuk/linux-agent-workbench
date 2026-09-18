#!/usr/bin/env bash
# Builds the terminal image, pins its id in images/terminal/image.json and removes the previous
# builds so podman storage does not accumulate ~1.7 GB of dead layers per rebuild.
set -euo pipefail
cd "$(dirname "$0")/.."

NAME="${1:-terminal}"            # terminal | browser
INSTANCE="${LAW_INSTANCE:-}"
if [[ -n "$INSTANCE" && ! "$INSTANCE" =~ ^[a-z][a-z0-9-]{0,23}$ ]]; then echo "invalid LAW_INSTANCE" >&2; exit 2; fi
IMAGE="localhost/law-${NAME}${INSTANCE:+-$INSTANCE}"
case "$NAME" in terminal|browser) ;; *) echo "expected terminal or browser" >&2; exit 2 ;; esac
node scripts/check-storage.mjs before-build

pnpm --filter @law/protocol build
pnpm --filter "@law/${NAME}-worker" build
SHA="$(git rev-parse --short HEAD)"
podman build -f "images/${NAME}/Containerfile" -t "${IMAGE}:${SHA}" -t "${IMAGE}:latest" .
ID="$(podman image inspect "${IMAGE}:${SHA}" --format '{{.Id}}')"
printf '{ "tag": "%s", "id": "%s" }\n' "$SHA" "$ID" > "images/${NAME}/image.json"
echo "image ${IMAGE}:${SHA} id=${ID}"

if [ -z "$INSTANCE" ]; then bash scripts/prune-images.sh; fi
node scripts/check-storage.mjs after-build
