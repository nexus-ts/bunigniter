# Changelog

All notable changes to Bunigniter are documented in this file.

## [0.5.4] — 2026-07-01

### Changed

- **Entry point renamed** — `dev.ts` → `main.ts` across all example apps, scaffold templates, and documentation. The entry point now follows the conventional `main.ts` naming pattern used by most Bun frameworks.
- **TypeBox updated** — Bumped from `1.2.16` to `^1.3` in scaffold templates for new projects.
- **Elysia updated** — Bumped from `2.0.0-exp.12` to `2.0.0-exp.13` in both `package.json` and scaffold templates.

### Fixed

- **Test discovery** — Updated `tests/examples.test.ts` to discover example apps by `main.ts` instead of `dev.ts`.

[0.5.4]: https://github.com/nexus-ts/bunigniter/compare/v0.5.3...v0.5.4

## [0.5.3] — 2026-06-29

### Added

- **`endpoints` config section** — Separate from `services`, controls built-in framework endpoints (`health`, `openapi`). Default: `health: true`, `openapi: false`.
- **Config-driven route visibility** — `/health` and OpenAPI routes now respect `config.endpoints.*` settings in `bi list` output.

### Changed

- **Moved `openapi` from `services` to `endpoints`** — OpenAPI is no longer a tree-shakeable service but a built-in endpoint controlled via config.
- **Moved `/health` from always-enabled to config-controlled** — Now disabled via `endpoints.health: false` instead of hard-coded.
- **Improved `bi list` output** — System routes section now shows only enabled endpoints based on config.

### Fixed

- **TypeScript interface compliance** — Fixed `AppConfig.endpoints` type definition to match runtime usage.

[0.5.3]: https://github.com/nexus-ts/bunigniter/compare/v0.5.2...v0.5.3

## [0.5.0] — 2026-06-29

### Added

- **`bi new` command** — Interactive project scaffold with 5-step wizard:
  1. Runtime (Bun-only / Cloudflare Workers)
  2. Database (SQLite / PostgreSQL / MySQL / none)
  3. OpenAPI docs (y/N)
  4. Template (simple welcome page / full CRUD todo app)
  5. Install dependencies (Y/n)
- **`bi init` command** — Same wizard but scaffolds into current directory, merges existing package.json.
- **`bi init` with `--yes` flag** — Skips all prompts, uses defaults (CI-friendly).
- **Todo template** for `bi new` — Full CRUD todo app with toggle, delete, stats, validation.
- **JSON data store** (`helpers/json-db.ts`) — In-memory storage for `database=none` mode. No DB setup required.
- **`this.load.helper('name')` / `this.load.service('name')`** — CI3-style loader for user-defined helpers and services.
- **`askUntil()` prompt validation** — Invalid input re-prompts instead of silently defaulting.
- **External template files** (`src/cli/templates/*.tpl`) — Large template content extracted from scaffold.ts for maintainability.
- **Config-driven tree shaking** — Set `services: { cache: false }` in `config/app.ts` to exclude unused services from build.
- **`create-bunigniter` simplified** — From 1200+ lines to ~190-line thin wrapper delegating to `bi init --yes`.

### Changed

- **`src/helpers/` → `src/services/`** — Stateful service classes (Cache, Queue, Mail, Upload, Image, Session, WS) moved out of helpers. Backward-compatible re-exports maintained.
- **Architecture simplified** — Three layers only: Helper (stateless function), Service (stateful class), Middleware (HTTP pipeline).
- **Dynamic service imports** — Cache, Queue, Mail, Upload, WS, OpenAPI, Modules now `await import()`'d at boot. Unused services are tree-shaken by Bun's bundler.
- **All example ports unified to 3000** — Previously used scattered ports (3000-3006).
- **`config/app.ts` template** — Extracted to `src/cli/templates/config-app.ts.tpl` with comprehensive inline comments.
- **Doc structure** — `helpers.md` split into `helpers.md` (14 modules) + `services.md` (7 classes).

### Fixed

- **`edge-controller.ts` missing from dist** — Added to build allowlist.
- **`scaffold.ts` import ordering** — Biome lint compliance.
- **Relative imports in services** — `mail.ts` and `upload.ts` now correctly import `env` from `../helpers/env`.
- **package.json duplicate key** — `./helpers/image` was listed twice in exports.

### Docs

- **New guides**: Getting Started, Middleware Guide, Inertia-style Pages, Architecture doc.
- **New skills**: Skills README index with

### Added

- **`bi new` command** — Interactive project scaffold with 5-step wizard:
  1. Runtime (Bun-only / Cloudflare Workers)
  2. Database (SQLite / PostgreSQL / MySQL / none)
  3. OpenAPI docs (y/N)
  4. Template (simple welcome page / todo — placeholder)
  5. Install dependencies (Y/n)
  Generates routes, views, config, DB seed, `.env.example`, `.gitignore`, `tsconfig.json`.
- **`bi init` command** — Same interactive wizard as `new`, but scaffolds into the **current directory** and **merges** existing `package.json` (preserving scripts, deps, devDeps). Perfect for adding Bunigniter to an existing project.
- **`src/cli/scaffold.ts`** — Single source of truth for all project scaffold templates. Previously scattered across `create-bunigniter/src/index.ts` (1200+ lines).
- **`examples/simple-app/`** — Minimal CodeIgniter 3-style welcome page example. `/` renders a Rendu welcome view, `/api` returns JSON. Playwright E2E test included.

### Changed

- **`create-bunigniter`** — Simplified from 1200+ lines to a ~190-line thin wrapper. All scaffolding logic now lives in `bunigniter`'s `bi new` command. The wrapper creates the project directory, installs `bunigniter`, then delegates to `bun run bi new`.
- **`README.md`** — Install section now warns to always use `@latest`. CLI reference includes `bi new` / `bi init`. Example apps table includes `simple-app`.
- **`AGENTS.md`** — Updated CLI count (25→28), added `scaffold.ts` conventions, added example apps.
- **`docs/user-guide/cli-reference.md`** — Updated with all 20 implemented commands (many previously marked as missing). `bi new` and `bi init` added to current commands.
- **`skills/cli.md`** — Added `new`/`init` commands, `scaffold.ts` reference.

### Fixed

- **`scripts/build-dist.ts`** — Added `edge-controller.ts` to ALLOWLIST so the file is included in the `dist/` bundle. Previously caused `Cannot find module './edge-controller'` at runtime.
- **Scaffold `package.json`** — Added `react` and `react-dom` to generated dependencies (required by `bunigniter`'s view renderer).

## [0.4.1] — 2026-06-29

### Added

- **EdgeController** — Lightweight base class for Cloudflare Workers (`bunigniter/edge-controller`). No `node:fs` dependency, fully edge-compatible.
- **createD1App()** — Factory for building edge apps from a D1 database binding or `DbClient` (`bunigniter/edge`).
- **registerController()** — Register an `EdgeController` class on an Elysia edge app (`bunigniter/edge`).
- **renderViewFromSource()** — Edge-safe Rendu template rendering that accepts source strings instead of file paths (`bunigniter/view/renderer`).
- **Type exports** — `Dialect`, `DbConfig`, `QueryResult` now exported from the main entry point.
- **Package exports** — New subpath exports: `./edge`, `./db/drizzle`, `./view/renderer`, `./edge-controller`.

### Changed

- **elysia** — Updated from `2.0.0-exp.9` to `2.0.0-exp.12`.
- **README** — Rewritten with concise badges, value-first messaging, removed repetition.

### Fixed

- **CI lockfile freeze** — `bun.lock` now matches `package.json` (elysia version bump).
- **Biome lint errors** — `@ts-ignore` → `@ts-expect-error`, import/export sorting, formatting.

[0.4.1]: https://github.com/nexus-ts/bunigniter/compare/v0.4.0...v0.4.1

## [0.4.0] — 2026-06-28

### Fixed

- **npm publish: root package.json paths** — `build-dist.ts` now also rewrites the root `package.json` export paths to `./dist/` before publish, so npm/Bun consumers resolve correctly to the `dist/` directory. Previously only `dist/package.json` was rewritten, but npm consumers read the root `package.json` which still pointed to non-existent `./src/` paths.
- **`defineHandler` not exported** — Added `export { defineHandler } from "./helpers/handler"` to main entry point so `import { defineHandler } from "bunigniter"` works.
- **`postpublish` script** — Replaced `rm -rf dist` with a proper restore script (`scripts/restore-pkg.ts`) that restores root `package.json` from backup and removes `dist/`.
- **Double `dist/` entry in `.gitignore`** — Cleaned up duplicate and added `package.json.dev` (backup file) to gitignore.

### Changed

- **`scripts/build-dist.ts`** — Refactored with try/catch error handling, proper backup/restore flow:
  1. Saves original `package.json` (with `./src/` paths) as `package.json.dev`
  2. Creates `dist/package.json` with `./` paths for internal dist resolution
  3. Rewrites root `package.json` to `./dist/` paths for npm consumers
- **`scripts/restore-pkg.ts`** — New script that restores root `package.json` from backup and cleans up `dist/` after publish.

[0.4.0]: https://github.com/nexus-ts/bunigniter/compare/v0.3.1...v0.4.0

## [0.3.1] — 2026-06-28

### Fixed

- **npm publish workflow** — Automated npm publish via GitHub Actions on release
- **Version bump** — 0.3.0 unpublished and re-published as 0.3.1

[0.3.1]: https://github.com/nexus-ts/bunigniter/compare/v0.3.0...v0.3.1

## [0.3.0] — 2026-06-28

### Added

- **Image manipulation** — `sharp`-based engine: resize, crop, rotate, flip, greyscale, blur, sharpen, negate, tint, modulate, watermark (image + text), metadata, format conversion (JPEG/PNG/WebP/AVIF/TIFF)
- **File upload** — Auto body detection, `hasFile()`, `validate()`, `delete()`, `deleteFile()`, Bun `File` support, extension/MIME validation
- **Request input** — `this.request.*` with 16 methods: `input()`, `get()`, `post()`, `only()`, `has()`, `filled()`, `method()`, `isAjax()`, `ip()`, `boolean()`, `integer()`, `json()`, `bearerToken()`, `userAgent()`, `cookie()`, `server()`
- **CORS middleware** — Rewritten for Elysia v2 with `derive('global')` + `beforeHandle('global')` pattern
- **CSRF middleware** — HMAC-SHA256 token signing via `node:crypto`, cookie-based validation
- **Logger middleware** — Request logging with `derive('global')` + `afterHandle('global')`, color-coded status
- **Rate limiter** — Per-instance in-memory store, configurable limits, skip paths
- **Bun APIs skill** — Comprehensive `skills/bun-apis.md` referencing `Bun.CSRF`, `Bun.CryptoHasher`, `Bun.password`, etc.
- **Biome 2.5.1** — Lint/format with `bun run lint` / `bun run fmt`, CI integration
- **Playwright UI tests** — 9 end-to-end tests for Slack example app

### Fixed

- **Elysia v2 compatibility** — All middleware use `derive('global')` / `beforeHandle('global')` / `afterHandle('global')` for cross-plugin scope
- **File-router** — `[param].ts` files no longer double-append `/:id` for `show()`/`update()`/`destroy()` methods
- **Template rendering** — Replaced `??` operators with `||` / `typeof` guards for Rendu compatibility
- **Module resolution** — `bunigniter` now self-links in root `node_modules/` for workspace development
- **TypeScript strictness** — Fixed `noImplicitAnyLet` across `edge-builder.ts`, `file-router.ts`, `server-router.ts`

### Changed

- **Package rename** — `@nexusts/core` → `bunigniter`, v0.2.0 → v0.3.0
- **CLI** — `nx` → `bi` command
- **Repository** — `github.com/nexus-ts/framework` → `github.com/nexus-ts/bunigniter`
- **npm publish** — `dist/`-only via `prepublishOnly` build script, 192 → 51 files in tarball
- **Docs restructured** — `docs/` → `docs/user-guide/` (13 files) + `docs/analysis/` (3 files)

### Tests

- **238 tests** (+154 from 0.2.0) — All 27 helpers now have test coverage
- New test files: `cors`, `csrf`, `logger`, `throttle`, `handler`, `queue`, `schedule`, `debug`, `middleware`, `middleware-loader`, `session-middleware`, `request-context`, `modules`, `image`, `upload`, `request`, `playwright`
- CI: Bun 1.3.14 pinned, `libvips-dev` for sharp, biome lint check, 5-min timeout

[0.3.0]: https://github.com/nexus-ts/bunigniter/compare/v0.2.0...v0.3.0
