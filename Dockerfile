FROM node:20-slim

WORKDIR /app

# Copy the pre-built api-server artifact and its dependencies
COPY artifacts/api-server/dist ./dist
COPY artifacts/api-server/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/index.mjs"]
