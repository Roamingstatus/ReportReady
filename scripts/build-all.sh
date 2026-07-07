#!/usr/bin/env bash
# Install workspace deps and build API + frontend (Railway / CI).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

install_workspace() {
  local dir="$1"
  echo "[build] installing dependencies in ${dir}..."
  rm -rf "${dir}/node_modules"
  npm ci --prefix "${dir}" --include=dev --include=optional
}

install_workspace "${ROOT}/artifacts/api-server"
echo "[build] building API..."
npm run build --prefix "${ROOT}/artifacts/api-server"

install_workspace "${ROOT}/artifacts/reportready"
echo "[build] building frontend..."
npm run build --prefix "${ROOT}/artifacts/reportready"

echo "[build] done."
