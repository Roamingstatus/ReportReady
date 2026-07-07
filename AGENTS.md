# ReportReady

ReportReady is a web app offering free, printable nurse report sheets, plus **The Breakroom** — a nurse lounge page at `/breakroom`.

## What runs here

- **`artifacts/api-server`** — Express API (`dist/index.mjs`). Routes include `GET /api/healthz`, `POST /api/feedback`, analytics (`/api/analytics/*`), and admin Google OAuth (`GET /api/analytics/admin/google/start`). **Rebuild after API changes:** `cd artifacts/api-server && npm run build`.
- **`artifacts/reportready`** — React/Vite SPA (source in `src/`, build output in `dist/public/`). Uses a dual-bootstrap: `/breakroom` is the new lounge UI; all other routes load the preserved legacy bundle from `public/legacy/`.
- **`scripts/devserver.mjs`** — Static file server + `/api` proxy (production-like local serving).
- **`scripts/start.mjs`** — Runs API + devserver together on one port (used by Docker/Railway).

## Run locally (recommended — hot reload)

**Requirements:** Node.js **18+** (Node 20 LTS recommended).

From the repo root:

```bash
# First time only
cd artifacts/api-server && npm install && npm run build && cd ../..
cd artifacts/reportready && npm install && cd ../..

# Start API + Vite dev server
bash run-dev.sh
```

Open:

- **App:** http://localhost:22838/
- **Breakroom:** http://localhost:22838/breakroom

`run-dev.sh` starts:

1. API on port **3001** (`NODE_ENV=production`)
2. Vite dev server on port **22838** (proxies `/api` → `:3001`)

Or use npm from the repo root:

```bash
npm run dev
```

## Run locally (production build, no Vite)

Serve the built static files + API (good for smoke-testing deploy output):

```bash
cd artifacts/reportready && npm install && npm run build && cd ../..
bash run-prod-local.sh
```

Or: `npm start` from the repo root.

## API only

```bash
cd artifacts/api-server
PORT=3001 NODE_ENV=production node dist/index.mjs
```

- `PORT` is **required**.
- Use `NODE_ENV=production` — dev mode can crash due to hard-coded pino worker paths in the bundle.

## Build / typecheck

```bash
cd artifacts/api-server && npm run build
cd artifacts/reportready
npm run typecheck
npm run build
```

## Docker

```bash
docker build -t reportready .
docker run -e PORT=9090 -p 9090:9090 reportready
```

UI and `/api/*` are both on the container's `PORT`.

## Feedback

`POST /api/feedback` sends feedback email via [Resend](https://resend.com). Required env vars on the API process:

- `RESEND_API_KEY`
- `FEEDBACK_TO_EMAIL` (default `support@nexusgarden.live`)
- `FEEDBACK_FROM_EMAIL` (default `ReportReady <support@nexusgarden.live>`)

## Troubleshooting

| Problem | Fix |
|--------|-----|
| `crypto.hash is not a function` / Vite won't start | You had Vite 7 on Node 18. Run `cd artifacts/reportready && npm install` — this repo pins Vite 6 for Node 18 compatibility. |
| `PORT` / `BASE_PATH` errors | Use `bash run-dev.sh` from repo root; it sets these automatically. |
| Blank page on `/` | Legacy bundle loads from `/legacy/`; ensure `public/legacy/` exists and run `npm run build` if you changed source. |
| Feedback fails | Start the API (`run-dev.sh` does this) — a static-only server can't reach `/api/feedback`. |
