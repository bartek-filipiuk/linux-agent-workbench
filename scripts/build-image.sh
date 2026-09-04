#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm --filter @law/protocol build
pnpm --filter @law/terminal-worker build
SHA="$(git rev-parse --short HEAD)"
podman build -f images/terminal/Containerfile -t "localhost/law-terminal:${SHA}" -t localhost/law-terminal:latest .
ID="$(podman image inspect "localhost/law-terminal:${SHA}" --format '{{.Id}}')"
printf '{ "tag": "%s", "id": "%s" }\n' "$SHA" "$ID" > images/terminal/image.json
echo "image localhost/law-terminal:${SHA} id=${ID}"
