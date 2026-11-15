# syntax=docker/dockerfile:1
#
# SkillSwap runs as ONE container with ONE persistent volume.
#   * better-sqlite3 writes to a file, so the disk must survive restarts
#   * WebRTC signalling rooms live in process memory
# Scaling past a single machine breaks both. See docs/ARCHITECTURE.md.

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ---------------------------------------------------------------- deps
# better-sqlite3 is a native module: it needs a toolchain to compile when no
# prebuilt binary matches this platform. This is the step that fails on hosts
# whose base image is missing python3/make/g++.
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# --------------------------------------------------------------- build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------------------------------------------------------------- run
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/data/skillswap.db

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps    /app/node_modules ./node_modules
COPY --from=builder /app/.next        ./.next
COPY --from=builder /app/public       ./public
COPY package.json server.js ./
COPY scripts ./scripts
# db.ts reads these two at runtime to create tables and load the catalogue.
COPY src/lib/schema.sql src/lib/taxonomy.sql ./src/lib/

# The volume is mounted here; the app must be able to write to it.
RUN mkdir -p /data && chown -R node:node /data /app
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
