# Graph Report - h3-zoom-test  (2026-11-21)

## Corpus Check
- Corpus is ~25,390 words - fits in a single context window. You may not need a graph.

## Summary
- 1101 nodes · 1711 edges · 92 communities (63 shown, 29 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.84)
- Token cost: 69,498 input · 0 output

## Community Hubs (Navigation)
- Web Jest & Package Config
- Infra Plan & Deploy Docs
- API Config & Constants
- SSE Item Events Transport
- API Client Nx Targets
- Web Page & UI Components
- Multipart File Upload Interceptor
- Health Check Controller
- Item DTOs & Pagination
- RTK Query API Client
- Web TS Config
- Prisma Database Service
- Root Layout & Redux Store
- Item Form Dropzone
- Root Nx Plugin Deps
- Root Dev Tooling Deps
- Nest Module Wiring
- Item List & Stream Badge
- Item Form Schema & Upload Hook
- Base TS Compiler Options
- Item Controller Endpoints
- API E2E Project
- Compose API Environment
- API Runtime Dependencies
- Nx Workspace Config
- Item Service & SSE Stream
- API Bootstrap & OpenAPI
- API Client TS Lib Config
- API Package Manifest
- Env File Resolution Utils
- Item Event Type Guards
- ESLint Configs
- API App TS Config
- Item List Tests
- Compose Migrate Service
- OpenAPI Codegen Config
- Compose Web Service
- API Build Target
- Prisma Config & Dotenv
- API Serve Targets
- XHR Upload Mock
- Web Spec TS Config
- Compose Postgres Service
- API Client Spec TS Config
- SWC Jest Configs
- API E2E TS Config
- API Serve Configurations
- API Spec TS Config
- Web E2E TS Config
- EventSource Mock
- API Prune Lockfile Target
- API Test & Prune Targets
- API TS Project Refs
- Playwright E2E Setup
- Compose Services Root
- Compose Build Args
- Compose Healthchecks
- Compose Redis Service
- OpenAPI Generate Target
- API Webpack Config
- Web E2E Package
- Root Jest Preset
- Root TS Project Refs
- Copy Workspace Modules Target
- API Client TS Refs
- E2E Global Setup/Teardown
- Next.js Config
- Renovate Config
- SVG Module Typings
- ESLint Dep
- eslint-config-next Dep
- eslint-config-prettier Dep
- eslint-plugin-import Dep
- eslint-plugin-jsx-a11y Dep
- eslint-plugin-react Dep
- eslint-plugin-react-hooks Dep
- Nx Dep
- @nx/eslint Dep
- @nx/js Dep
- @nx/web Dep
- Sass Dep
- @swc/core Dep
- @swc/jest Dep
- @swc-node/register Dep
- tslib Dep
- @types/jest Dep
- TypeScript Dep
- webpack-cli Dep
- SVG ReactComponent
- API Client Hook Re-exports
- Infinite Items Query Export

## God Nodes (most connected - your core abstractions)
1. `@nestjs/common` - 20 edges
2. `ItemService` - 20 edges
3. `compilerOptions` - 20 edges
4. `compilerOptions` - 19 edges
5. `environment` - 18 edges
6. `ItemForm()` - 17 edges
7. `@radix-ui/themes` - 14 edges
8. `CommonService` - 13 edges
9. `ListItemsQueryDto` - 12 edges
10. `EnvironmentVariables` - 11 edges

## Surprising Connections (you probably didn't know these)
- `ItemDetailProps` --references--> `ItemListEntryDto`  [EXTRACTED]
  apps/web/src/features/item/components/item-detail.tsx → libs/api-client/src/lib/generated.ts
- `ItemRowProps` --references--> `ItemListEntryDto`  [EXTRACTED]
  apps/web/src/features/item/components/item-row.tsx → libs/api-client/src/lib/generated.ts
- `useItemEvents()` --calls--> `parseItemEvent()`  [EXTRACTED]
  apps/web/src/features/item/hooks/use-item-events.ts → libs/api-client/src/lib/item-events.ts
- `h3-zoom-test-api-client Library README` --references--> `Nx Monorepo`  [EXTRACTED]
  libs/api-client/README.md → README.md
- `h3-zoom-test-api-client Library README` --conceptually_related_to--> `libs/api-client (Generated RTK Query Client)`  [INFERRED]
  libs/api-client/README.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Tier 1 Top-Five Stabilisation Changes** — analysis_version_control, analysis_stateless_vm, analysis_monitoring_alerting, analysis_ci_cd_pipeline, analysis_terraform_iac [EXTRACTED 1.00]
- **Item Submit -> Queue -> Process -> SSE Flow** — readme_items_api, readme_prisma_postgresql, readme_bullmq_worker, readme_redis, readme_itemservice_scoreitem, readme_sse_event_stream [EXTRACTED 1.00]
- **Compose Services Mapped to Managed AWS** — readme_rds_postgresql, readme_elasticache_redis, readme_ecs_fargate, readme_alb_cloudfront, readme_ssm_secrets, readme_mountpoint_s3_uploads, readme_terraform [EXTRACTED 1.00]

## Communities (92 total, 29 thin omitted)

### Community 0 - "Web Jest & Package Config"
Cohesion: 0.05
Nodes (49): config, createJestConfig, jestConfig, nextJest, options, dependencies, @hookform/resolvers@^5.9.1, next@~16.1.6 (+41 more)

### Community 1 - "Infra Plan & Deploy Docs"
Cohesion: 0.07
Nodes (49): Health-checked Deploy with Automatic Rollback, CI/CD Pipeline with Automated Tests, CloudWatch Metrics and Alarms, Containerised Deploy (Docker Compose on Single VM), ECS/Fargate (Tier 2 Ceiling), External Uptime Check (UptimeRobot / Healthchecks.io), Managed ElastiCache (Redis) for Cache/Sessions/Queue, Managed RDS Database (+41 more)

### Community 2 - "API Config & Constants"
Cohesion: 0.08
Nodes (29): LogLevel, Debug, Error, Fatal, Info, Trace, Warn, NodeEnv (+21 more)

### Community 3 - "SSE Item Events Transport"
Cohesion: 0.09
Nodes (22): ITEM_EVENT_NAMES, ItemEventFrame, ItemEventsTransport, nextConnectionStatus(), openInert(), openItemEventsTransport(), RECONNECT_ATTEMPTS_BEFORE_STALE, SHARED_WORKER_PROBE_MS (+14 more)

### Community 4 - "API Client Nx Targets"
Cohesion: 0.06
Nodes (34): cache, dependsOn, executor, inputs, options, outputs, dependencies, @reduxjs/toolkit@^2.12.0 (+26 more)

### Community 5 - "Web Page & UI Components"
Cohesion: 0.12
Nodes (18): Index(), ResizeObserverStub, submitTrigger, Accordion(), AccordionEntry, AccordionProps, DetailList(), DetailListEntry (+10 more)

### Community 6 - "Multipart File Upload Interceptor"
Cohesion: 0.11
Nodes (14): rxjs@^7.8.0, SSE_HEARTBEAT_INTERVAL_MS, MultipartInterceptor, MultipartRequest, buildInterceptor(), next, Part, stored (+6 more)

### Community 7 - "Health Check Controller"
Cohesion: 0.13
Nodes (7): AppController, AppService, SuccessTimestampDto, CommonModule, CommonService, buildService(), @nestjs/testing

### Community 8 - "Item DTOs & Pagination"
Cohesion: 0.11
Nodes (16): SortDirection, Asc, Desc, IsValidValueForContentType(), ItemDto, ItemListEntryDto, ItemResultDto, ItemSortField (+8 more)

### Community 9 - "RTK Query API Client"
Cohesion: 0.13
Nodes (16): baseApi, addTagTypes, ItemControllerListApiArg, ItemControllerListApiResponse, ItemControllerSubmitApiArg, ItemControllerSubmitApiResponse, ItemDto, ItemSortField (+8 more)

### Community 10 - "Web TS Config"
Cohesion: 0.08
Nodes (23): compilerOptions, allowJs, allowSyntheticDefaultImports, emitDeclarationOnly, esModuleInterop, forceConsistentCasingInFileNames, incremental, jsx (+15 more)

### Community 11 - "Prisma Database Service"
Cohesion: 0.15
Nodes (6): SSE_EVENT_REPLAY_PAGE_SIZE, createPrismaAdapter(), DatabaseService, CLIENT_EVENT_NAMES, CLIENT_MESSAGE_DATA_KEYS, FindManyArgs

### Community 12 - "Root Layout & Redux Store"
Cohesion: 0.16
Nodes (12): metadata, RootLayout(), RootLayoutProps, StoreProvider(), StoreProviderProps, useAppDispatch, useAppSelector, useAppStore (+4 more)

### Community 13 - "Item Form Dropzone"
Cohesion: 0.11
Nodes (12): formatBytes(), ItemForm(), acceptFile(), onDrop(), onDropzoneKeyDown(), openFilePicker(), RequiredLabel(), renderForm() (+4 more)

### Community 14 - "Root Nx Plugin Deps"
Cohesion: 0.10
Nodes (20): jest-environment-node@~30.3.0, @nestjs/schematics@^11.0.0, @nx/nest@23.1.1, @nx/next@23.1.1, @swc/cli@~0.8.1, ts-node@10.9.1, webpack-dev-server@^5.2.1, license (+12 more)

### Community 15 - "Root Dev Tooling Deps"
Cohesion: 0.10
Nodes (21): devDependencies, babel-jest@~30.3.0, @eslint/js@^9.8.0, jest-util@~30.3.0, prettier@^3.8.1, prisma@7.10.0, @swc/helpers@0.5.18, ts-jest@^29.4.7 (+13 more)

### Community 16 - "Nest Module Wiring"
Cohesion: 0.17
Nodes (9): apiConfig, dbConfig, redisConfig, DatabaseModule, FileModule, ItemModule, ItemsProcessor, @nestjs/bullmq (+1 more)

### Community 17 - "Item List & Stream Badge"
Cohesion: 0.17
Nodes (9): dedupeById(), ItemList(), STREAM_BADGE, StreamBadge(), StreamBadgeProps, SseStatus, Listener, Store (+1 more)

### Community 18 - "Item Form Schema & Upload Hook"
Cohesion: 0.14
Nodes (13): CONTENT_TYPE_OPTIONS, DEFAULT_VALUES, itemFormSchema, ItemFormValues, Handler, Store, UploadItemArgs, UploadStatus (+5 more)

### Community 19 - "Base TS Compiler Options"
Cohesion: 0.10
Nodes (20): compilerOptions, composite, customConditions, declarationMap, emitDeclarationOnly, importHelpers, isolatedModules, lib (+12 more)

### Community 20 - "Item Controller Endpoints"
Cohesion: 0.12
Nodes (4): ApiSuccessResponse(), ItemController, CreateItemInput, toNumberOrNull()

### Community 21 - "API E2E Project"
Cohesion: 0.11
Nodes (16): devDependencies, axios@^1.6.0, dependsOn, executor, options, outputs, name, nx (+8 more)

### Community 22 - "Compose API Environment"
Cohesion: 0.14
Nodes (18): environment, API_HOST, API_PORT, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER (+10 more)

### Community 23 - "API Runtime Dependencies"
Cohesion: 0.12
Nodes (17): dependencies, bullmq@^6.3.0, @fastify/static@^8.3.0, lodash@^4.18.1, @nestjs/bullmq@^11.0.5, @nestjs/common@^11.0.0, @nestjs/config@^4.0.4, pg@^8.23.0 (+9 more)

### Community 24 - "Nx Workspace Config"
Cohesion: 0.12
Nodes (16): analytics, linter, style, generators, @nx/next, namedInputs, default, production (+8 more)

### Community 26 - "API Bootstrap & OpenAPI"
Cohesion: 0.19
Nodes (11): @nestjs/core@^11.0.0, @nestjs/platform-fastify@^11.2.3, @nestjs/swagger@^11.2.0, AppModule, bootstrap(), buildOpenApiDocument(), emit(), OUT_PATH (+3 more)

### Community 27 - "API Client TS Lib Config"
Cohesion: 0.13
Nodes (14): compilerOptions, emitDeclarationOnly, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir, rootDir (+6 more)

### Community 28 - "API Package Manifest"
Cohesion: 0.16
Nodes (13): @fastify/multipart@^10.1.1, ioredis@^5.11.1, devDependencies, @nestjs/testing@^11.0.0, @types/lodash@^4, @types/pg@^8.23.1, name, private (+5 more)

### Community 29 - "Env File Resolution Utils"
Cohesion: 0.21
Nodes (10): class-transformer@^0.5.1, class-validator@^0.15.1, reflect-metadata@^0.2.0, envFilePaths, findWorkspaceRoot(), resolveEnvFilePaths(), validateEnv(), class-transformer (+2 more)

### Community 30 - "Item Event Type Guards"
Cohesion: 0.23
Nodes (11): ItemResultDto, isItemEventData(), isItemResult(), ITEM_EVENT, ItemEvent, ItemEventData, ItemEventName, ItemProcessedEvent (+3 more)

### Community 31 - "ESLint Configs"
Cohesion: 0.18
Nodes (6): eslint-plugin-playwright@^1.6.2, @next/eslint-plugin-next@^16.1.6, @nx/eslint-plugin@23.1.1, eslint-plugin-playwright, @next/eslint-plugin-next, @nx/eslint-plugin

### Community 32 - "API App TS Config"
Cohesion: 0.17
Nodes (11): compilerOptions, emitDecoratorMetadata, experimentalDecorators, outDir, rootDir, target, tsBuildInfoFile, types (+3 more)

### Community 33 - "Item List Tests"
Cohesion: 0.17
Nodes (6): @testing-library/react@16.3.0, fetchNextPage, mockHook, renderList(), ResizeObserverStub, @testing-library/react

### Community 34 - "Compose Migrate Service"
Cohesion: 0.17
Nodes (12): depends_on, migrate, postgresql, redis, command, condition, container_name, depends_on (+4 more)

### Community 35 - "OpenAPI Codegen Config"
Cohesion: 0.17
Nodes (11): apiFile, apiImport, exportName, hooks, lazyQueries, mutations, queries, outputFile (+3 more)

### Community 36 - "Compose Web Service"
Cohesion: 0.18
Nodes (11): condition, api, HOSTNAME, NODE_ENV, PORT, web, container_name, depends_on (+3 more)

### Community 37 - "API Build Target"
Cohesion: 0.20
Nodes (10): production, runBuildTargetDependencies, buildTarget, configurations, continuous, defaultConfiguration, dependsOn, executor (+2 more)

### Community 38 - "Prisma Config & Dotenv"
Cohesion: 0.20
Nodes (7): dotenv@^17.4.1, dotenv-expand@^12.0.3, envFiles, port, workspaceRoot, dotenv, dotenv-expand

### Community 39 - "API Serve Targets"
Cohesion: 0.22
Nodes (10): continuous, executor, options, options, command, cwd, executor, options (+2 more)

### Community 41 - "Web Spec TS Config"
Cohesion: 0.20
Nodes (9): compilerOptions, jsx, module, moduleResolution, outDir, types, extends, include (+1 more)

### Community 42 - "Compose Postgres Service"
Cohesion: 0.20
Nodes (10): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, container_name, environment, image, ports, restart (+2 more)

### Community 43 - "API Client Spec TS Config"
Cohesion: 0.20
Nodes (9): compilerOptions, forceConsistentCasingInFileNames, module, moduleResolution, outDir, types, extends, include (+1 more)

### Community 44 - "SWC Jest Configs"
Cohesion: 0.22
Nodes (5): swcJestConfig, { readFileSync }, swcJestConfig, { readFileSync }, swcJestConfig

### Community 45 - "API E2E TS Config"
Cohesion: 0.22
Nodes (8): compilerOptions, esModuleInterop, noImplicitAny, noUnusedLocals, outDir, extends, include, references

### Community 46 - "API Serve Configurations"
Cohesion: 0.25
Nodes (9): configurations, executor, options, development, buildTarget, env, NODE_ENV, env (+1 more)

### Community 47 - "API Spec TS Config"
Cohesion: 0.22
Nodes (8): compilerOptions, emitDecoratorMetadata, experimentalDecorators, outDir, types, extends, include, references

### Community 48 - "Web E2E TS Config"
Cohesion: 0.22
Nodes (7): compilerOptions, allowJs, outDir, sourceMap, exclude, extends, include

### Community 50 - "API Prune Lockfile Target"
Cohesion: 0.25
Nodes (8): options, buildTarget, cache, dependsOn, executor, options, outputs, prune-lockfile

### Community 51 - "API Test & Prune Targets"
Cohesion: 0.25
Nodes (8): nx, targets, passWithNoTests, dependsOn, executor, prune, test, options

### Community 52 - "API TS Project Refs"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, tsBuildInfoFile, extends, files, include, references

### Community 53 - "Playwright E2E Setup"
Cohesion: 0.25
Nodes (6): @nx/devkit@23.1.1, @nx/playwright@23.1.1, @playwright/test@^1.37.0, @nx/devkit, @nx/playwright, @playwright/test

### Community 54 - "Compose Services Root"
Cohesion: 0.25
Nodes (7): container_name, ports, restart, volumes, name, services, api

### Community 55 - "Compose Build Args"
Cohesion: 0.32
Nodes (8): build, NEXT_PUBLIC_API_URL, args, context, dockerfile, target, build, build

### Community 56 - "Compose Healthchecks"
Cohesion: 0.46
Nodes (8): healthcheck, interval, retries, start_period, test, timeout, healthcheck, healthcheck

### Community 57 - "Compose Redis Service"
Cohesion: 0.29
Nodes (7): command, container_name, image, ports, restart, volumes, redis

### Community 58 - "OpenAPI Generate Target"
Cohesion: 0.33
Nodes (6): cache, dependsOn, executor, inputs, outputs, openapi

### Community 59 - "API Webpack Config"
Cohesion: 0.33
Nodes (4): { join }, { NxAppWebpackPlugin }, @nx/webpack@23.1.1, @nx/webpack

### Community 60 - "Web E2E Package"
Cohesion: 0.33
Nodes (5): name, nx, implicitDependencies, private, version

### Community 61 - "Root Jest Preset"
Cohesion: 0.33
Nodes (4): jest@~30.3.0, @nx/jest@23.1.1, jest, @nx/jest

### Community 62 - "Root TS Project Refs"
Cohesion: 0.33
Nodes (5): compileOnSave, compilerOptions, extends, files, references

### Community 63 - "Copy Workspace Modules Target"
Cohesion: 0.40
Nodes (5): cache, dependsOn, executor, outputs, copy-workspace-modules

### Community 64 - "API Client TS Refs"
Cohesion: 0.40
Nodes (4): extends, files, include, references

### Community 67 - "Renovate Config"
Cohesion: 0.50
Nodes (3): config:recommended, extends, $schema

## Knowledge Gaps
- **31 isolated node(s):** `Min`, `Min`, `Default`, `Asc`, `Desc` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 462 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `prisma` connect `Root Dev Tooling Deps` to `Prisma Config & Dotenv`, `Root Nx Plugin Deps`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **What connects `Min`, `Min`, `Default` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Web Jest & Package Config` be split into smaller, more focused modules?**
  _Cohesion score 0.050980392156862744 - nodes in this community are weakly interconnected._
- **Why does `targets` connect `API Test & Prune Targets` to `API Build Target`, `API Serve Targets`, `API Serve Configurations`, `API Prune Lockfile Target`, `OpenAPI Generate Target`, `Copy Workspace Modules Target`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `Infra Plan & Deploy Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.0653061224489796 - nodes in this community are weakly interconnected._
- **Why does `nx` connect `API Test & Prune Targets` to `API Package Manifest`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `API Config & Constants` be split into smaller, more focused modules?**
  _Cohesion score 0.07505285412262157 - nodes in this community are weakly interconnected._