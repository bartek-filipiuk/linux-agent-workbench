#!/usr/bin/env bash
# Removes every podman image except: the ids pinned in images/*/image.json, the base images they
# build from, and images used by running containers (podman refuses those; they are reported).
# Intermediate build-cache images are removed too: podman 3.4 otherwise keeps every historical layer.
set -euo pipefail
cd "$(dirname "$0")/.."
KEEP=""
for j in images/*/image.json; do [ -f "$j" ] && KEEP="$KEEP $(node -p "require('./$j').id")"; done
for base in $(grep -h '^FROM ' images/*/Containerfile | awk '{print $2}' | sort -u); do
  id="$(podman image inspect "$base" --format '{{.Id}}' 2>/dev/null || true)"; [ -n "$id" ] && KEEP="$KEEP $id"
done
removed=0; kept=0
for id in $(podman images -a --format '{{.ID}}' | sort -u); do
  keep=0; for k in $KEEP; do case "$k" in "${id}"*) keep=1 ;; esac; done
  [ "$keep" = 1 ] && continue
  if podman rmi "$id" >/dev/null 2>&1; then removed=$((removed+1)); else kept=$((kept+1)); echo "kept ${id}: still in use by a container" >&2; fi
done
echo "pruned ${removed} images, ${kept} in use"
podman system df | head -2
