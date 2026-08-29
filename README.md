# H3 Zoom Test

A small full‑stack "submit an item, watch it get processed" application, built as an
[Nx](https://nx.dev) monorepo.

- **`apps/api`** – NestJS + Fastify HTTP API. Persists items with Prisma/PostgreSQL,
  emits an event stream, and runs a BullMQ worker (backed by Redis) **in the same
  process** to "process" each submitted item.
- **`apps/web`** – Next.js (App Router) UI. Submit items (text / long text / numeric /
  file upload) and watch their status update live over Server‑Sent Events.
- **`libs/api-client`** – RTK Query client generated from the API's OpenAPI document.

```text
apps/
  api/        NestJS + Fastify API  (port 3000)
  api-e2e/    Jest e2e suite against a running API
  web/        Next.js web app       (port 4000)
  web-e2e/    Playwright e2e suite
libs/
  api-client/ generated RTK Query client, consumed by web
docker/
  volumes/    bind‑mounted data for the compose stack (git‑ignored)
```

---

## Table of contents

- [Prerequisites](#prerequisites)
- [Environment configuration](#environment-configuration)
- [Run directly (local, no containers for the apps)](#run-directly-local-no-containers-for-the-apps)
- [Run with Docker Compose](#run-with-docker-compose)
- [Ports & URLs](#ports--urls)
- [Common tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Deploying on AWS](#deploying-on-aws)
- [AI tools used](#ai-tools-used)

---

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 24.x | Matches the Docker images (`node:24-alpine`). |
| Yarn | 4.18.0 | Managed by Corepack: `corepack enable`. Do not use npm. |
| Docker + Compose v2 | recent | Required for the compose stack; also the easiest way to get PostgreSQL + Redis for a direct run. |
| PostgreSQL | 18 | Only if you run the database natively instead of via Docker. |
| Redis | 7 | Only if you run Redis natively instead of via Docker. |

This repo pins Yarn via `packageManager`. After `corepack enable`, the correct Yarn
version is selected automatically inside the project.

---

## Environment configuration

All processes (the apps **and** the Prisma CLI **and** `docker compose`) read a single
cascade of dotenv files **from the workspace root**. `<mode>` is `NODE_ENV`
(`development` by default).

Precedence — first file to define a variable wins, and the real environment always
overrides files:

1. `.env.<mode>.local`
2. `.env.local`  *(skipped when `NODE_ENV` is `test` / `testing`)*
3. `.env.<mode>`
4. `.env`

`.env.example` is the documented template. `.env.local` is checked in with sane
localhost defaults, so **a direct run works with no setup**. `docker compose` only
auto‑loads `.env` (not `.env.local`), but every variable in `docker-compose.yml` has a
built‑in default, so `.env` is optional there too.

To customize, copy the template and edit:

```sh
cp .env.example .env
```

### Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development` also enables Swagger UI at the API root. |
| `LOG_LEVEL` | `info` | Fastify logger level. |
| `API_HOST` / `API_PORT` | `127.0.0.1` / `3000` | Address the API binds to. |
| `WEB_SCHEME` / `WEB_HOST` / `WEB_PORT` | `http` / `127.0.0.1` / `4000` | Browser origin of the web app. The API uses this to build its CORS allowlist. |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | `127.0.0.1` / `5432` / `rafiandria23` / `rafiandria23` / `h3_zoom_test` | PostgreSQL connection. |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_USER` / `REDIS_PASSWORD` / `REDIS_DB_INDEX` | `127.0.0.1` / `6379` / `rafiandria23` / `rafiandria23` / `0` | Redis connection for BullMQ. |
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:3000` | **Compose build arg only.** Inlined into the web bundle at build time, so it must be the *browser‑facing* API origin — never an internal compose hostname. |

---

## Run directly (local, no containers for the apps)

### 1. Install dependencies

```sh
corepack enable
yarn install
```

### 2. Start PostgreSQL and Redis

Easiest is to borrow just those two services from the compose file:

```sh
docker compose up -d postgresql redis
```

(Or run native PostgreSQL 18 / Redis 7 and make sure the `DB_*` / `REDIS_*` values in
your env match.)

### 3. Generate the Prisma client and create the schema

The generated client (`apps/api/src/generated/prisma`) is git‑ignored, so this step is
required on a fresh clone. `db push` applies `apps/api/prisma/schema.prisma` directly
(there are no migration files).

```sh
yarn nx run @rafiandria23/h3-zoom-test-api:prisma -- generate
yarn nx run @rafiandria23/h3-zoom-test-api:prisma -- db push
```

### 4. Run the API

```sh
yarn nx serve @rafiandria23/h3-zoom-test-api
# alias: yarn nx dev @rafiandria23/h3-zoom-test-api
```

- Listens on `http://127.0.0.1:3000`, routes are under `/api/v1`.
- Health check: `GET http://127.0.0.1:3000/api/v1`
- Swagger UI: `http://127.0.0.1:3000/` (development only).
- The BullMQ worker starts with the process — no separate command.

### 5. Run the web app

In a second terminal:

```sh
yarn nx dev @rafiandria23/h3-zoom-test-web
```

Open `http://127.0.0.1:4000`.

> The web client reads `NEXT_PUBLIC_API_URL` at build time and falls back to
> `http://127.0.0.1:3000`, which is correct for a default local run. Only set it if you
> move the API.

### Production‑style local run (optional)

Build optimized bundles and serve them the way the containers do:

```sh
# API: bundle to apps/api/dist, then run the plain Node output
yarn nx build @rafiandria23/h3-zoom-test-api
node apps/api/dist/main.js

# Web: Next standalone build, then the standalone server
NEXT_PUBLIC_API_URL=http://127.0.0.1:3000 yarn nx build @rafiandria23/h3-zoom-test-web
PORT=4000 HOSTNAME=127.0.0.1 node apps/web/.next/standalone/apps/web/server.js
```

When you're done with the infra containers:

```sh
docker compose stop postgresql redis
```

---

## Run with Docker Compose

> [`docker-compose.yml`](docker-compose.yml) is a **local development convenience** — a
> one‑command way for a reviewer to run the whole app. It is not the deployment target.
> The per‑app `Dockerfile`s are the real artifact: in a real deployment CI/CD builds
> those images and ships them to managed infrastructure (see [Deploying on
> AWS](#deploying-on-aws)).

The stack in [`docker-compose.yml`](docker-compose.yml) builds and runs everything.

| Service | Image / build | Role |
| --- | --- | --- |
| `postgresql` | `postgres:18-alpine` | Database. Data in `./docker/volumes/postgresql`. |
| `redis` | `redis:7-alpine` | BullMQ backing store. Data in `./docker/volumes/redis`. |
| `migrate` | build `apps/api/Dockerfile` (target `build`) | One‑shot `prisma db push`, then exits. `api` waits for it to finish. |
| `api` | build `apps/api/Dockerfile` | NestJS API + BullMQ worker. Uploads persisted to `./docker/volumes/uploads`. |
| `web` | build `apps/web/Dockerfile` | Next.js standalone server. |

Startup order is enforced with health checks and `depends_on`:
`postgresql` + `redis` healthy → `migrate` completes → `api` healthy → `web`.

### Bring the stack up

```sh
docker compose up --build
```

- Web: `http://127.0.0.1:4000`
- API: `http://127.0.0.1:3000/api/v1`
- Swagger UI is **off** here (`NODE_ENV=production`).

Add `-d` to run detached. Drop `--build` on later runs unless you changed
dependencies or a `Dockerfile`.

### Everyday commands

```sh
docker compose up -d --build          # start (rebuild images)
docker compose logs -f api web        # tail app logs
docker compose ps                     # service status / health
docker compose restart api            # restart one service
docker compose down                   # stop and remove containers
docker compose down -v                # also remove named volumes (none here; see note)
docker compose build --no-cache api   # force a clean rebuild
```

### Configuration

Compose reads `./.env` (optional — every key has a default). Common overrides:

```sh
# .env
API_PORT=3000
WEB_PORT=4000
LOG_LEVEL=debug
DB_PASSWORD=something-stronger
REDIS_PASSWORD=something-stronger

# If the browser reaches the API somewhere other than http://127.0.0.1:3000
# (e.g. a LAN IP or hostname), set this so the web bundle is built against it:
NEXT_PUBLIC_API_URL=http://192.168.1.50:3000
```

After changing `NEXT_PUBLIC_API_URL` (a build arg), rebuild the web image:

```sh
docker compose up -d --build web
```

### Data & persistence

State is bind‑mounted under `docker/volumes/` (git‑ignored), not Docker named
volumes:

- `docker/volumes/postgresql` – database files
- `docker/volumes/redis` – Redis dump
- `docker/volumes/uploads` – files uploaded through the web app

To wipe everything and start fresh:

```sh
docker compose down
rm -rf docker/volumes/postgresql docker/volumes/redis docker/volumes/uploads
```

### Re‑running the schema sync

The `migrate` service runs `prisma db push --accept-data-loss` every time it starts.
To re‑apply after editing `apps/api/prisma/schema.prisma`:

```sh
docker compose up --build migrate
```

---

## Ports & URLs

| What | URL | Env knob |
| --- | --- | --- |
| Web app | <http://127.0.0.1:4000> | `WEB_PORT` |
| API base | <http://127.0.0.1:3000/api/v1> | `API_PORT` |
| API health | <http://127.0.0.1:3000/api/v1> | — |
| Swagger UI (dev only) | <http://127.0.0.1:3000/> | — |
| PostgreSQL | 127.0.0.1:5432 | `DB_PORT` |
| Redis | 127.0.0.1:6379 | `REDIS_PORT` |

### API surface

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/v1` | Health / timestamp. |
| `POST` | `/api/v1/items` | Submit an item (`application/json` or `multipart/form-data` for files). Persists it, emits `item_submitted`, enqueues it on the `items` queue. |
| `GET` | `/api/v1/items` | Paginated list with processing status (`?page=&size=&sort_by=&sort_direction=`). |
| `GET` | `/api/v1/items/events` | SSE stream of `item_submitted` / `item_processed` events. Resumable via `Last-Event-ID`. |

---

## Common tasks

All tasks run through Nx. Use `yarn nx <target> <project>` or `yarn nx run-many -t <target>`.

```sh
# Tests (Jest)
yarn nx test @rafiandria23/h3-zoom-test-api
yarn nx test @rafiandria23/h3-zoom-test-web
yarn nx run-many -t test

# Lint / typecheck
yarn nx run-many -t lint
yarn nx typecheck @rafiandria23/h3-zoom-test-api

# e2e
yarn nx e2e @rafiandria23/h3-zoom-test-api-e2e     # Jest, boots the API
yarn nx e2e @rafiandria23/h3-zoom-test-web-e2e     # Playwright

# Prisma CLI (any subcommand after `--`)
yarn nx run @rafiandria23/h3-zoom-test-api:prisma -- studio
yarn nx run @rafiandria23/h3-zoom-test-api:prisma -- db push

# Regenerate the OpenAPI doc and the RTK Query client
yarn nx run @rafiandria23/h3-zoom-test-api:openapi
yarn nx run @rafiandria23/h3-zoom-test-api-client:codegen

# Visualize the project graph
yarn nx graph
```

---

## Troubleshooting

**`Cannot find module '../../generated/prisma/client'` when starting the API.**
Run `yarn nx run @rafiandria23/h3-zoom-test-api:prisma -- generate`. The client is
git‑ignored and must be generated on a fresh clone.

**API exits with `Invalid DB_PORT` / `Invalid API_PORT` / env validation errors.**
A numeric variable is unset or non‑numeric. Check your root `.env` / `.env.local`
against the [variables table](#variables).

**Web loads but requests fail with CORS errors.**
The API's allowlist is `${WEB_SCHEME}://${WEB_HOST}:${WEB_PORT}`. Make sure you open
the web app at exactly that origin (default `http://127.0.0.1:4000`, **not**
`localhost`).

**Web can't reach the API under Docker Compose.**
`NEXT_PUBLIC_API_URL` is baked into the bundle at build time and must be
browser‑reachable (not `http://api:3000`). Set it in `.env` and
`docker compose up -d --build web`.

**`migrate` service fails.**
It needs `postgresql` healthy first. Check `docker compose logs postgresql`, confirm
the `DB_*` values, then `docker compose up --build migrate`.

**Port already in use.**
Change `API_PORT` / `WEB_PORT` / `DB_PORT` / `REDIS_PORT` in `.env` and restart.

**Nx cache acting stale.**
`yarn nx reset` clears the local daemon and cache.

---

## Deploying on AWS

The Compose stack is only a local runner; a real deployment reuses the two per‑app
`Dockerfile`s and nothing else from it. The services still map onto managed AWS
equivalents with little change:

- **PostgreSQL → Amazon RDS for PostgreSQL** (or Aurora Serverless v2).
- **Redis → Amazon ElastiCache for Redis / Valkey.**
- **API + worker → one container image on ECS Fargate.** The BullMQ worker runs
  in‑process, so a single task definition covers both, and it scales horizontally —
  the SSE layer already fans "processed" ticks out across instances via Redis
  `QueueEvents`. Front it with an ALB (SSE needs the response un‑buffered, so keep it
  on the ALB rather than API Gateway) and CloudFront for TLS.
- **Web → the Next.js standalone image on ECS Fargate** behind the same ALB/CloudFront,
  or Amplify Hosting. `NEXT_PUBLIC_API_URL` is baked in at image build time, so it must
  be set to the public API origin in the build pipeline.
- **Schema sync → the `migrate` one‑shot as an ECS `RunTask`** step in the deploy
  pipeline (promote `db push` to real Prisma migrations first).
- **Secrets/config → SSM Parameter Store / Secrets Manager**, injected as task env vars.

**Provisioning & delivery.** Infrastructure (VPC, RDS, ElastiCache, ECR, ECS services,
ALB, IAM, the S3 bucket) is defined as Terraform and applied per environment. A CI/CD
pipeline builds and tags the `api` and `web` images from their `Dockerfile`s, pushes to
ECR, runs the `migrate` task, then rolls the ECS services — `NEXT_PUBLIC_API_URL` is
supplied as a build arg at the web image step. (Everything here can also be stood up
manually the first time; the pipeline just makes it repeatable.)

**Uploads / file storage.** The API streams uploads to `<cwd>/uploads` on the local
filesystem. Rather than rewrite that path against the S3 SDK, the plan is to back that
directory with S3 by mounting a bucket into the container — [Mountpoint for Amazon
S3](https://github.com/awslabs/mountpoint-s3) (or `s3fs-fuse`) at `/app/uploads` — so
the existing local‑filesystem code is untouched while the data lives durably in S3.
This app only ever writes a whole object once and reads it back sequentially, which is
exactly Mountpoint's supported access pattern (no random writes, no renames). If that
constraint ever becomes limiting, the fallback is a small `FileService` swap to the S3
SDK with a presigned‑URL download path.

---

## AI tools used

- **Planning & architecture** — Claude (Sonnet 5, high reasoning effort) via the
  claude.ai web chat, for initial bootstrapping, app planning, and design discussion.
  I owned the architecture decisions and adopted the model's suggestions where they fit.
- **Implementation** — Claude Code (Sonnet 5) in the VS Code extension, for the heavy
  lifting of writing larger functions and boilerplate, the Docker / Compose setup, and
  this README. All generated code was reviewed and adjusted by hand.
- **Background processing stub** — no stub was provided with the brief, so the 2‑second
  wait + score step ([`ItemService.scoreItem`](apps/api/src/modules/item/item.service.ts))
  was written for this project.
