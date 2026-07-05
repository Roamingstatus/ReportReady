FROM node:20-slim

WORKDIR /app

# Pre-built API bundle (self-contained esbuild output; the sibling pino-*.mjs
# files are only used by the dev logger, which is disabled under NODE_ENV=production).
COPY artifacts/api-server/dist ./artifacts/api-server/dist

# Pre-built static frontend (served by the web+proxy server).
COPY artifacts/shift-canvas/dist/public ./artifacts/shift-canvas/dist/public

# Launcher + static/proxy web server.
COPY scripts/start.mjs scripts/devserver.mjs ./scripts/

ENV NODE_ENV=production
# Public port; Railway (and most hosts) inject PORT at runtime and route to it.
ENV PORT=8080
# Internal port the API listens on behind the web+proxy server.
ENV API_PORT=3001

EXPOSE 8080

# Runs both the API (internal API_PORT) and the static+/api-proxy web server
# (public PORT) as one service.
CMD ["node", "scripts/start.mjs"]
