# Build context MUST be the monorepo root:
#   docker build -f admin/Dockerfile --build-arg NEXT_PUBLIC_API_URL=... .
# (backend/docker-compose.vps.yml does this.)

# ---- deps: install the whole workspace once (cached) ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/api-types/package.json packages/api-types/
COPY admin/package.json admin/
COPY frontend/package.json frontend/
RUN npm ci

# ---- build the admin app ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY packages ./packages
COPY admin ./admin
# NEXT_PUBLIC_* are inlined at build time.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_FRONTEND_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace admin && mkdir -p admin/public

# ---- runtime: standalone server only ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3100 HOSTNAME=0.0.0.0
RUN groupadd --system nodejs && useradd --system --gid nodejs nextjs
COPY --from=build --chown=nextjs:nodejs /app/admin/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/admin/.next/static ./admin/.next/static
COPY --from=build --chown=nextjs:nodejs /app/admin/public ./admin/public
USER nextjs
EXPOSE 3100
CMD ["node", "admin/server.js"]
