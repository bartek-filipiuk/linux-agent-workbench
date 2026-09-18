#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
node_bin="${POC_NODE_BIN:-/home/bartek/.nvm/versions/node/v24.20.0/bin/node}"
exec "$node_bin" run.mjs "$@"
