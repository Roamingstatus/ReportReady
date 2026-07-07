#!/usr/bin/env bash
# Start ReportReady locally: API + Vite dev server (hot reload).
#
# Usage (from repo root):
#   bash run-dev.sh
#
# Open: http://localhost:22838/
# Breakroom: http://localhost:22838/breakroom
#
# Env overrides:
#   PORT=22838       Web dev server port (default 22838)
#   API_PORT=3001    API server port (default 3001)
#   BASE_PATH=/      Vite base path (default /)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_PORT="${PORT:-22838}"
API_PORT="${API_PORT:-3001}"
export BASE_PATH="${BASE_PATH:-/}"
export API_PORT

node_major="$(node -p "Number(process.versions.node.split('.')[0])")"
if [[ "$node_major" -lt 18 ]]; then
  echo "Error: Node.js 18+ is required (found $(node -v))."
  echo "Install Node 20 LTS from https://nodejs.org/ and retry."
  exit 1
fi

if [[ ! -d "$ROOT/artifacts/api-server/node_modules" ]]; then
  echo "Installing API dependencies..."
  (cd "$ROOT/artifacts/api-server" && npm install)
fi

echo "[run-dev] Building API..."
(cd "$ROOT/artifacts/api-server" && npm run build)

if [[ ! -f "$ROOT/artifacts/api-server/dist/index.mjs" ]]; then
  echo "Error: API bundle missing at artifacts/api-server/dist/index.mjs"
  exit 1
fi

if [[ ! -d "$ROOT/artifacts/reportready/node_modules" ]]; then
  echo "Installing frontend dependencies..."
  (cd "$ROOT/artifacts/reportready" && npm install)
fi

cleanup() {
  if [[ -n "${API_PID:-}" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
  fi
  if [[ -n "${VITE_PID:-}" ]] && kill -0 "$VITE_PID" 2>/dev/null; then
    kill "$VITE_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "[run-dev] Starting API on :${API_PORT}..."
(
  cd "$ROOT/artifacts/api-server"
  PORT="$API_PORT" NODE_ENV=production node dist/index.mjs
) &
API_PID=$!

for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${API_PORT}/api/healthz" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

if ! curl -sf "http://127.0.0.1:${API_PORT}/api/healthz" >/dev/null 2>&1; then
  echo "Error: API did not become ready on port ${API_PORT}."
  exit 1
fi

if ! curl -sf "http://127.0.0.1:${API_PORT}/api/analytics/admin/config" >/dev/null 2>&1; then
  echo "Error: API is missing analytics admin routes. Rebuild with: cd artifacts/api-server && npm run build"
  exit 1
fi

echo "[run-dev] API ready."
echo "[run-dev] Starting Vite on http://localhost:${WEB_PORT}/ (BASE_PATH=${BASE_PATH})..."

(
  cd "$ROOT/artifacts/reportready"
  PORT="$WEB_PORT" BASE_PATH="$BASE_PATH" API_PORT="$API_PORT" npm run dev
) &
VITE_PID=$!

wait "$VITE_PID"
