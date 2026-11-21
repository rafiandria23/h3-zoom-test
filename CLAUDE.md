# Project: H3 Zoom Test

> `AGENTS.md` is a symlink to this file — edit `CLAUDE.md` only.

## 1. Product Overview

A small full-stack "submit an item, watch it get processed" app, built as a take-home test in an Nx monorepo. A user submits an item (text, long text, numeric, or file upload). The API persists it, enqueues it, and an in-process BullMQ worker "processes" it (a 2 s wait plus a score). The web UI shows the list and updates each row live over Server-Sent Events.

`README.md` is the run/deploy guide (env vars, Docker Compose, AWS plan). `ANALYSIS.md` is a **separate, unrelated** take-home write-up (TH-2). Do not touch it during app work.

## 2. Repository Layout

| Path              | Nx project                              | What it is                                                  |
| ----------------- | --------------------------------------- | ----------------------------------------------------------- |
| `apps/api`        | `@rafiandria23/h3-zoom-test-api`        | NestJS 11 + Fastify API and BullMQ worker (port 3000)       |
| `apps/web`        | `@rafiandria23/h3-zoom-test-web`        | Next.js 16 App Router UI (port 4000)                        |
| `libs/api-client` | `@rafiandria23/h3-zoom-test-api-client` | RTK Query client, generated from the API's OpenAPI document |
| `apps/api-e2e`    | `@rafiandria23/h3-zoom-test-api-e2e`    | Jest + axios e2e against a running API                      |
| `apps/web-e2e`    | `@rafiandria23/h3-zoom-test-web-e2e`    | Playwright e2e (needs API + Postgres + Redis up)            |
| `packages/`       | —                                       | Empty placeholder workspace                                 |
| `docker/volumes/` | —                                       | Bind-mounted Compose data (git-ignored)                     |

Always use the full scoped project name in Nx commands.

## 3. Architecture Decisions

- **The worker runs inside the API process.** `ItemsProcessor` (`@Processor('items')`) is a provider of `ItemModule`, so there's no separate worker app or image. Scaling the API scales the worker.
- **The event log is the source of truth for status.** Each item has `events` rows (`item_submitted`, `item_processed`). Status (`pending`/`done`) and `result` are derived from them in `ItemService.listItems`. There is no status column.
- **The SSE stream is resumable and cross-instance.** `Event.seq` (`BigInt @default(autoincrement())`) is the `Last-Event-ID` cursor. On connect the stream replays the backlog with `seq > cursor`, then drains again on every BullMQ `QueueEvents` "completed" tick. Redis delivers that tick to every API instance. A `ping` heartbeat goes out every 30 s.
- **The SSE endpoint is excluded from OpenAPI** (`@ApiExcludeEndpoint()`). Its client contract is written by hand in `libs/api-client/src/lib/item-events.ts`. `apps/api/src/modules/item/item-events.contract.spec.ts` guards it against drift.
- **The REST contract flows one way:** NestJS DTOs/decorators → `apps/api/openapi.json` (the `openapi` target, Nest preview mode, no DB/Redis needed) → `libs/api-client/src/lib/generated.ts` (the `codegen` target). CI fails if either committed file is stale.
- **Every successful response uses one envelope:** `SuccessTimestampDto` `{ success, timestamp, metadata?, data? }`, built via `CommonService.successTimestamp()`. It's documented per endpoint with the `ApiSuccessResponse(Model, { isArray, metadata })` decorator.
- **The schema is applied with `prisma db push`.** There are no migration files. Compose runs a one-shot `migrate` service (`db push --accept-data-loss`) before `api` starts.
- **Uploads are streamed to `<cwd>/uploads` on local disk** by `MultipartInterceptor` → `FileService`. Size is deliberately uncapped and there's no mimetype allowlist. The AWS plan is to back that directory with S3 via Mountpoint rather than rewrite against the S3 SDK (see README).
- **Soft delete:** `Item.deleted_at` is nullable, and list reads filter `deleted_at: null`.
- **The web gets live updates over SSE with polling as the fallback.** `openItemEventsTransport` tries a `SharedWorker` (one stream shared across tabs), then a per-tab `EventSource`, then nothing (`stale`). The list polls whenever the stream isn't `live`. `item_processed` patches the cached row in place. `item_submitted` invalidates the `items` tag (debounced, 300 ms).
- **The Dockerfiles are the deploy artifact. Compose is only a local/CI convenience.** CI's e2e job runs against the Compose stack.

## 4. Stack Details

- Node.js 24 (Docker `node:24-alpine`; CI `lts/*`)
- Yarn 4.18.0 via Corepack (`packageManager` field), `nodeLinker: node-modules`, no vendored binary
- Nx 23.3.2 — `nx` and every `@nx/*` on one exact version, enforced by `yarn.config.cjs` (`yarn constraints`)
- TypeScript ~6.0, `strict: true` (`tsconfig.base.json`: `nodenext`, `noUnusedLocals`, `noImplicitReturns`, `noImplicitOverride`)
- API: NestJS 11, `@nestjs/platform-fastify`, `@fastify/multipart`, `@nestjs/config`, `@nestjs/swagger`, `class-validator`/`class-transformer`, Prisma 7 (`prisma-client` generator + `@prisma/adapter-pg`), PostgreSQL 18, BullMQ + Redis 7, RxJS, lodash, webpack build
- Web: Next.js ~16.1, React 19, Radix Themes, Redux Toolkit / RTK Query, react-hook-form + zod, react-virtuoso, Sass
- Tests: Jest 30 (`@nx/jest`, SWC), Testing Library, Playwright
- Lint/format: ESLint 9 flat config (`@nx/eslint-plugin`, `--max-warnings 0`), Prettier 3 (`singleQuote`, `semi`, `trailingComma: all`)
- CI: GitHub Actions (`.github/workflows/ci.yml`) + SonarCloud. Deps: Renovate (`renovate.json`)

## 5. Project-Specific Conventions

### Workspace & tooling

- Yarn only. Never `npm`, `npx`, or `pnpm`. The one sanctioned npm call is the Corepack install in `.github/actions/setup/action.yml`.
- Run every task through an **existing** Nx target, whether plugin-inferred or declared in a project's `package.json` `nx.targets`. Check `yarn nx show project <name>` first. Don't call raw `tsc`/`webpack`/`next`/`jest`, and don't add a target that duplicates an inferred one. If a project lacks a target (e.g. `apps/web` has no `typecheck`), say so instead of inventing one.
- Runtime dependencies belong to the owning project's `package.json`. Root `package.json` holds only workspace-wide dev tooling.
- Nx upgrades go through `yarn nx migrate`, never a bare version bump. Renovate groups them and never automerges. Keep `@nx/*` in lockstep (`yarn constraints --fix`).
- Keep the NestJS packages in lockstep, and the Prisma CLI and `@prisma/*` on the same version (Renovate groups both).
- When bumping Yarn, update `packageManager` **and** `corepack prepare yarn@x.y.z` in both Dockerfiles.
- GitHub Actions `uses:` are pinned to **release tags** (`@v7.0.1`), never commit SHAs. `helpers:pinGitHubActionDigests` is deliberately ignored in Renovate.

### Environment

- Every process (API, Prisma CLI, Compose) reads one dotenv cascade **from the workspace root**: `.env.<mode>.local` → `.env.local` (skipped for `test`/`testing`) → `.env.<mode>` → `.env`. The first file to define a variable wins, and the real environment always wins.
- The cascade is implemented twice, in `apps/api/src/modules/common/common.util.ts` and in `apps/api/prisma.config.ts`. Change both together.
- A new env var needs four changes: a field on `EnvironmentVariables` (`common.dto.ts`), a default in its `registerAs` factory under `apps/api/src/configs/`, an entry in `.env.example`, and a row in the README variables table. Add it to `docker-compose.yml` too if the container needs it.
- `.env.example` is the committed template. `.env`/`.env.*` are git-ignored.
- Use `127.0.0.1`, not `localhost`. The CORS allowlist is exactly `${WEB_SCHEME}://${WEB_HOST}:${WEB_PORT}`.

### API (`apps/api`)

- Module layout: `src/modules/<name>/<name>.{module,controller,service,dto,constant,util,processor,interceptor}.ts`, plus an `index.ts` barrel where the module is shared (`common`).
- Wire format is **snake_case** everywhere: body fields, query params (`sort_by`, `sort_direction`), and DB columns (`content_type`, `created_at`). Don't camelCase the contract.
- The global prefix is `/api/v1`. It's set in both `main.ts` and `openapi.script.ts`, so keep them in sync. Swagger UI is served at `/` only when `NODE_ENV !== production`.
- The global `ValidationPipe` uses `transform`, `whitelist`, and `forbidUnknownValues`. Every input goes through a DTO with `class-validator` decorators **and** `@ApiProperty`/`@ApiPropertyOptional`, so OpenAPI stays complete.
- Query numbers arrive as strings. Coerce them with `@Type(() => Number)` (imported as `TransformType`). Reuse `PaginationQueryDto` for list endpoints, and whitelist sortable columns with an enum (`ItemSortField`).
- Constants and bounds live in `<module>.constant.ts` as named consts or enums with PascalCase members (`PaginationSize.Max`, `SortDirection.Asc`). No magic numbers inline. Use `RADIX` for `Number.parseInt`.
- Config factories use `registerAs` with `_.get(process, 'env.X', default)`, and throw `TypeError('Invalid X')` on a `NaN` port or index. Read config with `config.getOrThrow<T>('ns.key')` in services.
- Database access goes through `DatabaseService` (extends `PrismaClient` with the `PrismaPg` adapter). Write paths that touch multiple tables use `db.$transaction`.
- Import Prisma types and enums from `../../generated/prisma/{client,enums}`, never from `@prisma/client`.
- `BigInt` columns (`size`, `seq`) must not reach the JSON serializer. Convert at the API boundary (`toNumberOrNull`) or stringify (`seq` → SSE `id`).
- Server-derived upload metadata (`file_ref`, `mime_type`, `size`) goes on `request.storedFile` and is read via `@StoredFileDescriptor()`. It never goes on `request.body`, so a client can't supply it.
- Register lifecycle cleanup in `onModuleDestroy`. `enableShutdownHooks()` is on.

### Contract & API client (`libs/api-client`)

- Any change to a controller, DTO, or `@Api*` decorator must be followed by: `yarn nx run @rafiandria23/h3-zoom-test-api-client:codegen`. That target runs `openapi` first. Commit both `apps/api/openapi.json` and `libs/api-client/src/lib/generated.ts` **in the same change**.
- Hand-written client code lives next to the generated code on the same `baseApi` singleton: `base-api.ts`, `item-events.ts` (SSE contract), and `item-list.ts` (infinite query `items`, `PAGE_SIZE` 20, newest first).
- Changing `EventType` (Prisma) or `ItemService.toMessage()` means updating `item-events.ts` and the web `ITEM_EVENT_NAMES` literal in the same change. The contract spec will fail otherwise.
- The lib is consumed as TS source (`transpilePackages` in `next.config.js`). It has no build step.

### Web (`apps/web`)

- Components are `FC`-typed arrow consts with a separately declared, exported `Props` interface. `src/app/layout.tsx` is the reference: `const X: FC<XProps> = (...) => { ... }`. Never `function` components.
- File names are kebab-case (`item-form.tsx`, `use-item-events.ts`).
- Layout: route files in `src/app/`. Feature code in `src/features/<feature>/{components,hooks}/` with an `index.ts` barrel. Shared UI in `src/components/ui/` and providers in `src/components/providers/`. Store in `src/redux/`. Shared hooks in `src/hooks/`.
- Import across folders via the `@/` alias (`@/components`, `@/features/item`, `@/redux`). Relative imports are only for siblings within a feature.
- Styling: **SCSS only, never `.css`.** Use `src/app/global.scss` for document-level rules and `*.module.scss` CSS Modules for component styles. Layout and visuals come from Radix Themes primitives and props first. Don't add another UI or CSS library.
- Talk to the API only through `@rafiandria23/h3-zoom-test-api-client` hooks. The exceptions are the SSE transport and the XHR upload (`use-item-upload.ts`, needed because `fetch` can't report upload progress).
- Use the typed redux hooks in `src/hooks/redux.ts` (`useAppDispatch`, `useAppSelector`, `useAppStore`) in new code.
- Forms use react-hook-form + `zodResolver`. The client schema mirrors `IsValidValueForContentType` in `item.dto.ts`, so keep both in sync.
- Mark client components and hooks with `'use client'`.
- `NEXT_PUBLIC_API_URL` is inlined **at build time**. The fallback `http://127.0.0.1:3000` is repeated in `base-api.ts`, `use-item-events.ts`, and `use-item-upload.ts`.

### Testing

- **Jest, not vitest.** This overrides the global TS default. The workspace is wired to `@nx/jest` and SWC, so don't migrate.
- Unit specs sit next to the source as `*.spec.ts` / `*.spec.tsx`. API specs use `@nestjs/testing` or construct the class directly with hand-rolled fakes (`{} as never` for unused deps). Web specs use jsdom and `@testing-library/react`.
- Pull logic out of hard-to-test code into small exported pure functions and test those. Examples: `nextConnectionStatus`, `getNextPageParam`, `createItemEventsHub`, `resolveEnvFilePaths`.
- e2e needs real infrastructure: `docker compose up -d --wait api web` (or `postgresql redis` plus local serve). Run web e2e before API e2e, because api-e2e's teardown kills port 3000.

### Git

- Conventional Commits with a scope: `feat(api): …`, `fix(web): …`, `test(web-e2e): …`, `build(deps): …`, `ci: …`, `docs: …`, `chore(renovate): …`. Graph refreshes go in their own `chore(graphify): refresh knowledge graph` commit.
- Commit directly on `main` (no feature branch). Push only when asked.

## 6. Critical Constraints

- **NEVER hand-edit generated files** (§8). Regenerate them through their Nx target.
- **NEVER let the OpenAPI document or the generated client drift** from the controllers and DTOs. Regenerate and commit in the same change.
- **NEVER change the SSE event names or message shape on one side only.** Update `apps/api` and `libs/api-client` (and the web `ITEM_EVENT_NAMES`) together.
- **NEVER put server-derived fields (`file_ref`, `mime_type`, `size`) where a client can set them**, i.e. on DTOs or on `request.body`.
- **NEVER return a raw `BigInt`** in a response payload.
- **NEVER commit secrets** or real `.env*` files. `SONAR_TOKEN` exists only as a GitHub Actions secret.
- **NEVER use npm/npx**, and never pin GitHub Actions to SHAs.
- Don't add plain `.css`, a second UI kit, or `function`-style components to `apps/web`.
- Don't add migration tooling or change the `db push` flow without a spec (it's an architectural change).

## 7. Dev Commands

```sh
corepack enable && yarn install

# Infra for a direct run
docker compose up -d postgresql redis

# Prisma (any subcommand after `--`). `generate` is required on a fresh clone.
yarn nx run @rafiandria23/h3-zoom-test-api:prisma -- generate
yarn nx run @rafiandria23/h3-zoom-test-api:prisma -- db push

# Run
yarn nx serve @rafiandria23/h3-zoom-test-api      # http://127.0.0.1:3000/api/v1, Swagger at /
yarn nx dev @rafiandria23/h3-zoom-test-web        # http://127.0.0.1:4000
docker compose up --build                         # whole stack, production mode

# Contract
yarn nx run @rafiandria23/h3-zoom-test-api:openapi
yarn nx run @rafiandria23/h3-zoom-test-api-client:codegen

# Tests
yarn nx test <project>
yarn nx e2e @rafiandria23/h3-zoom-test-web-e2e -- --project=chromium
yarn nx e2e @rafiandria23/h3-zoom-test-api-e2e

yarn nx reset                                     # stale Nx cache/daemon
```

The CI gate (`.github/workflows/ci.yml`) runs these. Run them locally before pushing:

| Check                 | Command                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| Workspace constraints | `yarn constraints`                                                                                 |
| Format                | `yarn nx format:check --all` (fix with `yarn nx format:write`)                                     |
| Lint + typecheck      | `yarn nx run-many -t lint typecheck`                                                               |
| Unit tests            | `yarn nx run-many -t test --coverage`                                                              |
| Build                 | `yarn nx run-many -t build`. This is the only typecheck `apps/web` gets.                           |
| Contract drift        | codegen, then `git diff --exit-code -- apps/api/openapi.json libs/api-client/src/lib/generated.ts` |
| e2e                   | Compose stack plus both e2e suites (above)                                                         |

CI copies `.env.example` to `.env` and runs `prisma generate` before lint/test/build. Do the same in any fresh environment.

## 8. Generated Files (never edit by hand)

- `apps/api/src/generated/prisma/**`: Prisma client, git-ignored. Regenerate with `prisma -- generate`.
- `apps/api/openapi.json`: `openapi` target.
- `libs/api-client/src/lib/generated.ts`: `codegen` target.
- `apps/web/next-env.d.ts`: Next.js.
- `yarn.lock`: change it only through `yarn`.
- `graphify-out/**`: `graphify update .`

## 9. Definition of Done (project-specific additions)

On top of the global definition (compiles, tests written and passing, no lint/type errors, nothing broken):

- `yarn constraints`, `yarn nx format:check --all`, and `yarn nx run-many -t lint typecheck test` all pass.
- If `apps/web` changed, `yarn nx build @rafiandria23/h3-zoom-test-web` passes, since web has no `typecheck` target.
- If the API surface changed, `openapi.json` and `generated.ts` are regenerated and committed.
- If the SSE contract changed, both sides are updated and `item-events.contract.spec.ts` passes.
- Every new util, hook, service, or component ships with a colocated `*.spec.ts(x)`.
- New env vars are in `EnvironmentVariables`, the config factory, `.env.example`, and the README.
- `graphify update .` has been run after code changes.

## 10. Working Rules

These mirror the owner's global standards, so agents that don't load them follow them too:

- Read this file (and `spec.md`, if a task has one) before starting. State the plan in 2–3 sentences before writing code.
- Do one task at a time. Afterwards, list the files changed and run the relevant test command.
- Ask before adding any new external dependency.
- If a task needs more than 5 files changed, stop and ask for it to be broken down.
- Don't refactor outside the task's scope. Leave `// TODO(refactor): <reason>` and move on.
- Flag any change to a function, method, or constructor signature before making it.
- Architectural changes need a `spec.md` before any code.
- Errors: throw NestJS HTTP exceptions / `Error` subclasses in the API, and use `try`/`catch` at the edges in the web. Never swallow an error silently unless the UI surfaces it some other way (as `item-form.tsx` does with `isError`).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. When the answer is under a Markdown heading, `graphify section "<heading>"` prints that section's text, so the .md need not be opened. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
