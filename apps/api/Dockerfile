# syntax=docker/dockerfile:1

# NestJS + Fastify API. Built from the workspace root:
#   docker build -f apps/api/Dockerfile -t h3-zoom-test-api .
# The BullMQ worker (ItemsProcessor) runs in this same process — no separate
# worker image is needed.

# ---- base: pinned package manager, shared by the build stages --------------
FROM node:24-alpine AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare yarn@4.18.0 --activate
WORKDIR /app

# ---- deps: workspace install, cached until a manifest or the lockfile moves -
FROM base AS deps
COPY --parents package.json yarn.lock .yarnrc.yml apps/*/package.json libs/*/package.json ./
RUN --mount=type=cache,target=/root/.yarn/berry/cache,sharing=locked \
    yarn install --immutable

# ---- build: bundle main.js, then prune the lockfile to prod deps -----------
FROM deps AS build
ENV NX_DAEMON=false \
    NX_NO_CLOUD=true \
    CI=true
COPY . .
# apps/api/prisma.config.ts reads DB_* at module load even for `generate`, so
# pass throwaways here — real values come from compose at runtime.
RUN --mount=type=cache,target=/app/.nx/cache,sharing=locked \
    DB_HOST=127.0.0.1 DB_PORT=5432 DB_USER=build DB_PASSWORD=build DB_NAME=build \
      yarn nx run @rafiandria23/h3-zoom-test-api:prisma -- generate \
 && yarn nx build @rafiandria23/h3-zoom-test-api \
 && yarn nx run @rafiandria23/h3-zoom-test-api:prune

# ---- prod-deps: install only what the pruned lockfile lists ---------------
FROM base AS prod-deps
COPY --from=build /app/.yarnrc.yml ./
COPY --from=build /app/apps/api/dist/package.json /app/apps/api/dist/yarn.lock ./
# Not --immutable: `nx prune` regenerates this lockfile, Yarn normalizes it once.
RUN --mount=type=cache,target=/root/.yarn/berry/cache,sharing=locked \
    yarn install

# ---- runtime: alpine + prod node_modules + the bundle, nothing else --------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/dist ./
# MultipartInterceptor streams uploads to <cwd>/uploads — mount a volume here.
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 3000
CMD ["node", "main.js"]
