#!/usr/bin/env bash
# Removes only images whose known repository tags all belong to LAW.
# Pinned/base images, other projects, shared tags and unowned build cache are retained.
# Never use --force: Podman must retain any image still used by a container.
set -euo pipefail
cd "$(dirname "$0")/.."
KEEP=""
for j in images/*/image.json; do [ -f "$j" ] && KEEP="$KEEP $(node -p "require('./$j').id")"; done
for base in $(grep -h '^FROM ' images/*/Containerfile | awk '{print $2}' | sort -u); do
  id="$(podman image inspect "$base" --format '{{.Id}}' 2>/dev/null || true)"; [ -n "$id" ] && KEEP="$KEEP $id"
done
removed=0; kept=0
# Repository provenance matters: an unused image is not necessarily ours.
for id in $(podman images -a --format '{{.ID}} {{.Repository}}' | awk '
  $2 == "localhost/law-terminal" || $2 == "localhost/law-browser" { law[$1] = 1; next }
  { foreign[$1] = 1 }
  END { for (id in law) if (!foreign[id]) print id }
' | sort -u); do
  keep=0; for k in $KEEP; do case "$k" in "${id}"*) keep=1 ;; esac; done
  [ "$keep" = 1 ] && continue
  if podman rmi "$id" >/dev/null 2>&1; then removed=$((removed+1)); else kept=$((kept+1)); echo "kept ${id}: still in use by a container" >&2; fi
done
echo "pruned ${removed} images, ${kept} in use"
podman system df | head -2
