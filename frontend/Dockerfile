# Build context MUST be the monorepo root:
#   docker build -f frontend/Dockerfile --build-arg NEXT_PUBLIC_API_URL=... .

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/api-types/package.json packages/api-types/
COPY admin/package.json admin/
COPY frontend/package.json frontend/
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY packages ./packages
COPY frontend ./frontend
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ADMIN_APP_URL
ARG MAINTENANCE_FAIL_CLOSED=false
# middleware.ts is bundled at build time, so the bypass secret must be present
# here too - as a runtime-only variable it compiled to empty and ?bypass= never worked.
ARG MAINTENANCE_BYPASS_SECRET=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_ADMIN_APP_URL=$NEXT_PUBLIC_ADMIN_APP_URL \
    MAINTENANCE_FAIL_CLOSED=$MAINTENANCE_FAIL_CLOSED \
    MAINTENANCE_BYPASS_SECRET=$MAINTENANCE_BYPASS_SECRET \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace frontend

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd --system nodejs && useradd --system --gid nodejs nextjs
COPY --from=build --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/frontend/.next/static ./frontend/.next/static
COPY --from=build --chown=nextjs:nodejs /app/frontend/public ./frontend/public
USER nextjs
EXPOSE 3000
CMD ["node", "frontend/server.js"]
