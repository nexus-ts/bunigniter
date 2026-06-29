# Changelog

All notable changes to Bunigniter are documented in this file.

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
