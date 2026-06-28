# Changelog

All notable changes to Bunigniter are documented in this file.

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
