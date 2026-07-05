# ReportReady

ReportReady is a web app offering free, printable nurse report sheets. This repository is a **deployment/artifacts repo**: it contains only pre-built outputs (bundled backend + static frontend) and a `Dockerfile`. There is **no application source, build system, linter, or test suite** in this repo — those were intentionally trimmed from history (there are no `package.json`, lockfiles, or `pnpm-workspace.yaml`). Do not expect `npm install`/`build`/`lint`/`test` to work here.

## Cursor Cloud specific instructions

### What runs here
- **`artifacts/api-server`** — Express API, shipped as a self-contained esbuild bundle (`dist/index.mjs`). Routes: `GET /api/healthz` and `POST /api/feedback`.
- **`artifacts/reportready`** — the React/Vite SPA frontend (formerly codenamed `shift-canvas`), shipped as pre-built static files in `dist/public/` (uses `wouter` for client-side routing).
- **`artifacts/mockup-sandbox`** — no source in this repo (only symlinked `node_modules`); not runnable.

### Running the backend (api-server)
From `artifacts/api-server`:

```
PORT=3000 NODE_ENV=production node dist/index.mjs
```

- `PORT` is **required** — the server throws on startup if it is unset.
- Use `NODE_ENV=production`. **Gotcha:** in dev/non-production mode the bundle configures a `pino-pretty` transport whose worker path is hard-coded to the original build machine's absolute path (`/home/romi/.../artifacts/api-server/dist`). Running without `NODE_ENV=production` crashes at startup with `MODULE_NOT_FOUND` for `thread-stream-worker.mjs`. Production mode emits JSON logs and avoids the transport.
- The bundle is fully self-contained; the committed `node_modules` are **broken pnpm symlinks** (they point at a non-existent root `node_modules/.pnpm` store) and are **not** needed to run.
- `POST /api/feedback` writes JSON (and any screenshot) to a `feedback/` directory at the repo root (resolved as `artifacts/api-server/dist/../../..` = the workspace root). No database is used at runtime.

### Running the frontend (reportready)
The frontend is static (no build step here); serve `artifacts/reportready/dist/public/` with:
- SPA fallback to `index.html` for unknown paths (client-side routing), and
- a reverse proxy that forwards `/api/*` to the api-server (the app calls `/api/feedback` as a **same-origin relative URL**, so a plain static server alone will not reach the backend).

A minimal Node-only (no dependencies) static + `/api` proxy server is sufficient. Example core flow to smoke-test end to end: open the homepage, click a template's "View & Print", then "Print Sheet"; and submit the floating "Feedback" form (this exercises the frontend → `/api/feedback` → filesystem path).

### Single-service container (Railway)
The `Dockerfile` builds one image that runs the whole app on a single public port via `scripts/start.mjs`, which supervises two processes:
- the API on an internal port (`API_PORT`, default `3001`), and
- `scripts/devserver.mjs` on the platform's `PORT` (Railway injects this), proxying `/api` to the API.

If either process exits, the launcher exits non-zero so the platform restarts the service. Build/run locally: `docker build -t reportready . && docker run -e PORT=9090 -p 9090:9090 reportready` — then the UI and `/api/*` are both served on `:9090`.

### No lint/test/build
There are no lint, test, or build commands in this repo — it holds pre-built artifacts only. Environment setup requires no dependency installation.
