# syntax=docker/dockerfile:1

# Next.js web app. Built from the workspace root:
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=http://127.0.0.1:3000 -t h3-zoom-test-web .
#
# NEXT_PUBLIC_API_URL is inlined by Next at build time, so it must be the
# browser-facing API origin — not an internal compose hostname.

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

# ---- build: Next production build (standalone output) ---------------------
FROM deps AS build
ENV NX_DAEMON=false \
    NX_NO_CLOUD=true \
    CI=true
ARG NEXT_PUBLIC_API_URL=http://127.0.0.1:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY . .
RUN --mount=type=cache,target=/app/.nx/cache,sharing=locked \
    yarn nx build @rafiandria23/h3-zoom-test-web

# ---- runtime: the standalone server + its assets, nothing else -----------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    HOSTNAME=0.0.0.0
# `output: 'standalone'` (apps/web/next.config.js) emits a self-contained server
# with a minimal node_modules; static assets and public/ are copied separately.
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 4000
CMD ["node", "apps/web/server.js"]
