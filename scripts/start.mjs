// Single-service launcher for the ReportReady app.
//
// Starts two Node processes and supervises them so the whole thing can run as a
// single container / service (e.g. on Railway, which routes traffic to one $PORT):
//   1. api-server  — the Express API, on an internal port (API_PORT).
//   2. devserver   — static frontend + `/api` reverse proxy, on the public PORT.
//
// If either process exits, the other is torn down and the launcher exits non-zero
// so the platform restarts the service.
//
// Environment variables (all optional):
//   PORT        Public port the platform routes to.        (default 8080)
//   API_PORT    Internal port the API listens on.          (default 3001)
//   NODE_ENV    Passed to the API (use production).         (default production)
//   STATIC_DIR  Built frontend assets dir.                 (default <repo>/artifacts/shift-canvas/dist/public)
//   API_ENTRY   Path to the API bundle entry.              (default <repo>/artifacts/api-server/dist/index.mjs)
//   APP_DIR     Repo/app root used to resolve defaults.    (default parent of this script's dir)

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = process.env.APP_DIR || path.resolve(__dirname, '..');

const publicPort = process.env.PORT || '8080';
const apiPort = process.env.API_PORT || '3001';
const nodeEnv = process.env.NODE_ENV || 'production';
const staticDir =
  process.env.STATIC_DIR || path.resolve(appDir, 'artifacts', 'shift-canvas', 'dist', 'public');
const apiEntry =
  process.env.API_ENTRY || path.resolve(appDir, 'artifacts', 'api-server', 'dist', 'index.mjs');
const devserver = path.resolve(__dirname, 'devserver.mjs');

const children = [];
let shuttingDown = false;

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) {
    try {
      c.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }
  setTimeout(() => process.exit(code), 500);
}

function start(name, file, env) {
  const child = spawn(process.execPath, [file], {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  child.on('exit', (exitCode, signal) => {
    console.error(`[start] ${name} exited (code=${exitCode}, signal=${signal}); shutting down.`);
    shutdown(exitCode === 0 ? 1 : exitCode ?? 1);
  });
  children.push(child);
}

process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));

start('api', apiEntry, { NODE_ENV: nodeEnv, PORT: apiPort });
start('web', devserver, {
  PORT: publicPort,
  API_HOST: '127.0.0.1',
  API_PORT: apiPort,
  STATIC_DIR: staticDir,
});

console.log(`[start] api on :${apiPort} (NODE_ENV=${nodeEnv}), web on :${publicPort}`);
console.log(`[start] static dir: ${staticDir}`);
