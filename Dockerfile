# Imagen web de producción: frontend + backend en el mismo origen.
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY client/package*.json ./client/
RUN npm --prefix client ci

COPY server/package*.json ./server/
RUN npm --prefix server ci

COPY client ./client
COPY server/src ./server/src
COPY server/package.json ./server/package.json
COPY .env.example ./.env.example

RUN npm --prefix client run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001 \
    PROFESOR_IA_DATA_DIR=/app/data

COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/node_modules ./server/node_modules
COPY --from=build /app/server/src ./server/src
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/.env.example ./.env.example

RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 3001
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server/src/index.js"]
