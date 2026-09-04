#!/usr/bin/env bash
# Builds the terminal image, pins its id in images/terminal/image.json and removes the previous
# builds so podman storage does not accumulate ~1.7 GB of dead layers per rebuild.
set -euo pipefail
cd "$(dirname "$0")/.."

IMAGE=localhost/law-terminal
MIN_FREE_GB=5
MAX_STORAGE_GB=6   # current image + one previous image still used by a running sandbox + base

free_gb() { df --output=avail -BG / | tail -1 | tr -dc '0-9'; }
storage_gb() { podman system df --format '{{.Size}}' 2>/dev/null | head -1 | awk '{v=$1; if (v ~ /GB/) {sub(/GB/,"",v); print v+0} else if (v ~ /MB/) {sub(/MB/,"",v); print v/1000} else print 0}'; }

if [ "$(free_gb)" -lt "$MIN_FREE_GB" ]; then
  echo "build skipped: $(free_gb) GB free on /, need at least ${MIN_FREE_GB} GB" >&2
  exit 3
fi

pnpm --filter @law/protocol build
pnpm --filter @law/terminal-worker build
SHA="$(git rev-parse --short HEAD)"
podman build -f images/terminal/Containerfile -t "${IMAGE}:${SHA}" -t "${IMAGE}:latest" .
ID="$(podman image inspect "${IMAGE}:${SHA}" --format '{{.Id}}')"
printf '{ "tag": "%s", "id": "%s" }\n' "$SHA" "$ID" > images/terminal/image.json
echo "image ${IMAGE}:${SHA} id=${ID}"

bash scripts/prune-images.sh
STORAGE="$(storage_gb)"
echo "podman image storage: ${STORAGE} GB (limit ${MAX_STORAGE_GB} GB)"
if awk -v s="$STORAGE" -v m="$MAX_STORAGE_GB" 'BEGIN { exit !(s > m) }'; then
  echo "podman storage exceeds ${MAX_STORAGE_GB} GB after pruning; investigate before the next build (podman images -a; podman system df -v)" >&2
  exit 4
fi
