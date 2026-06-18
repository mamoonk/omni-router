# ---- Build stage ----
FROM node:22-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:web

# ---- Runtime stage ----
FROM node:22-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm rebuild better-sqlite3 bcrypt --build-from-source

COPY --from=builder /app/out ./out
COPY --from=builder /app/src/web ./src/web
COPY --from=builder /app/src/main/server ./src/main/server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/tsconfig.json ./

ENV NODE_ENV=production
ENV PORT=8080
ENV MYROUTER_DB_PATH=/data/omni-router.db

VOLUME ["/data"]

EXPOSE 8080

CMD ["node", "--import", "tsx", "src/web/server.ts"]
