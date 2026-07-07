#!/usr/bin/env bash
# Serve the production build locally (no Vite — works on any Node 18+).
#
# Usage:
#   bash run-prod-local.sh
#
# Build first if needed:
#   cd artifacts/reportready && npm install && npm run build

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_PORT="${PORT:-22838}"
API_PORT="${API_PORT:-3001}"

if [[ ! -f "$ROOT/artifacts/api-server/dist/index.mjs" ]] || [[ ! -d "$ROOT/artifacts/api-server/node_modules" ]]; then
  echo "Building API..."
  (cd "$ROOT/artifacts/api-server" && npm install && npm run build)
else
  echo "Rebuilding API..."
  (cd "$ROOT/artifacts/api-server" && npm run build)
fi

if [[ ! -d "$ROOT/artifacts/reportready/dist/public" ]]; then
  echo "Building frontend..."
  (cd "$ROOT/artifacts/reportready" && npm install && npm run build)
fi

export PORT="$WEB_PORT"
export API_PORT
export NODE_ENV=production

echo "[run-prod-local] Starting full stack on http://localhost:${WEB_PORT}/"
exec node "$ROOT/scripts/start.mjs"
