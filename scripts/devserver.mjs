// Static file server + /api reverse proxy for the ReportReady frontend.
//
// The shift-canvas SPA is a pre-built static bundle that calls the backend with
// same-origin relative URLs (e.g. `/api/feedback`). This server therefore does
// two things on a single port:
//   1. Serves the static frontend from STATIC_DIR (with SPA fallback to index.html).
//   2. Reverse-proxies any `/api/*` request to the api-server (API_HOST:API_PORT).
//
// Configuration via environment variables (all optional):
//   PORT        Port to listen on. Railway/hosts set this automatically.       (default 8080)
//   API_HOST    Host of the running api-server.                                (default 127.0.0.1)
//   API_PORT    Port of the running api-server.                                (default 3000)
//   STATIC_DIR  Directory of built frontend assets.                            (default ../artifacts/shift-canvas/dist/public)
//
// Usage (local): start the backend first, then this server.
//   (cd artifacts/api-server && PORT=3000 NODE_ENV=production node dist/index.mjs) &
//   node scripts/devserver.mjs

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || process.env.WEB_PORT || 8080);
const API_HOST = process.env.API_HOST || '127.0.0.1';
const API_PORT = Number(process.env.API_PORT || 3000);
const ROOT =
  process.env.STATIC_DIR ||
  path.resolve(__dirname, '..', 'artifacts', 'shift-canvas', 'dist', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function proxyApi(req, res) {
  const proxyReq = http.request(
    { host: API_HOST, port: API_PORT, method: req.method, path: req.url, headers: req.headers },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'proxy_error', detail: String(err) }));
  });
  req.pipe(proxyReq);
}

async function serveStatic(req, res) {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = path.join(ROOT, urlPath);
  // Prevent path traversal outside the static root.
  if (!filePath.startsWith(ROOT)) filePath = path.join(ROOT, 'index.html');
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    // SPA fallback: unknown paths are handled by the client-side router.
    filePath = path.join(ROOT, 'index.html');
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  }
}

http
  .createServer((req, res) => {
    if ((req.url || '').startsWith('/api')) return proxyApi(req, res);
    return serveStatic(req, res);
  })
  .listen(PORT, () => {
    console.log(`[devserver] static: ${ROOT}`);
    console.log(`[devserver] listening on http://0.0.0.0:${PORT} (proxying /api -> ${API_HOST}:${API_PORT})`);
  });
