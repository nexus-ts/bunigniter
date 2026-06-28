# Elysia v2.0 (kiana branch) — Technical Analysis

**Date:** 2026-06-27
**Branch:** `kiana` (codename: DayDream)
**Version:** `2.0.0-exp.8`
**Status:** Experimental / Pre-release
**Source:** `github.com/elysiajs/elysia` (460 files, +103,971 lines)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Adapter v2 — Multi-Runtime Architecture](#2-adapter-v2--multi-runtime-architecture)
3. [API Changes from v1.x](#3-api-changes-from-v1x)
4. [Type System Overhaul (Sucrose)](#4-type-system-overhaul-sucrose)
5. [WebSocket Reconstruction](#5-websocket-reconstruction)
6. [Build & Distribution](#6-build--distribution)
7. [Performance & Bundle Size](#7-performance--bundle-size)
8. [Migration Guide (v1.x → v2.0)](#8-migration-guide-v1x--v20)
9. [Stability Assessment](#9-stability-assessment)
10. [Timeline & Recommendations](#10-timeline--recommendations)

---

## 1. Overview

Elysia v2.0 is a **complete rewrite** of the Elysia framework. The entire codebase was replaced in a single squashed commit (42d227e) containing 460 files and 103,971 new lines. The changelog header is titled **"DayDream"**, suggesting this is the internal codename for the v2 cycle.

The driving goals of v2.0 are:

| Goal | Rationale |
|------|-----------|
| **Multi-runtime support** | Elysia v1.x was Bun-only. v2 adds Node, Deno, CF Workers, Vercel, Lambda, Netlify, Fastly |
| **Type system maturity** | Full type inference for macros, guards, WebSocket, Eden — matching NestJS-level type safety |
| **Tree-shakable TypeBox** | `import { Elysia }` should not pull in 700KB of typebox |
| **API simplification** | Remove deprecated APIs, shorten lifecycle names (`onRequest` → `request`) |
| **WebSocket as first-class citizen** | Schema validation, type inference, Eden integration for WS |
| **CJS + ESM dual build** | True npm compatibility |

The `kiana` branch name suggests it is named after a person or character (Kiana), which is a common Elysia convention for major release branches.

---

## 2. Adapter v2 — Multi-Runtime Architecture

### 2.1 The Adapter Interface

The most significant architectural change is the introduction of a formal adapter system (`src/adapter/`). Elysia v1.x directly called `Bun.serve()`. v2.0 abstracts the server layer behind an interface:

```ts
// src/adapter/types.ts
interface ElysiaAdapterOptions {
  name: string
  runtime: 'node' | 'deno' | 'bun' | 'cloudflare-worker'
           | 'browser' | 'vercel' | 'netlify' | 'lambda'
           | 'fastly' | 'edge' | 'unknown'

  isWebStandard: boolean

  listen?(app, options, callback): void
  stop?(app, closeActiveConnections): Promise<void>

  parse: {
    json(context): MaybePromise<Record<string, undefined> | unknown[]>
    text(context): MaybePromise<string>
    urlencoded(context): MaybePromise<Record<string, string | string[]>>
    arrayBuffer(context): MaybePromise<ArrayBuffer>
    formData(context): MaybePromise<Record<string, unknown>>
  }

  response: {
    map(response, set, ...params): unknown
    compact?(response, ...params): unknown
    static?(handle, hooks, setHeaders?, ...params): (() => unknown) | undefined
    nativeStatic?(handle, hooks, set?): (() => MaybePromise<Response>) | undefined
  }

  fetch?(app): (request: Request) => MaybePromise<Response>
}
```

### 2.2 Built-in Adapters

The source ships two adapters out of the box:

| Adapter | File | Target |
|---------|------|--------|
| **BunAdapter** | `src/adapter/bun/index.ts` | Bun runtime — native static route optimization, WebSocket |
| **WebStandardAdapter** | `src/adapter/web-standard/index.ts` | Any Web-Standard runtime (Node 22+, Deno, CF Workers, browsers) |

The `BunAdapter` extends the WebStandardAdapter with:
- Static route pre-collection (`collectStaticRoutes`) — precomputes Response objects for Bun's native `static` routes
- WebSocket global handler (`buildGlobalWSHandler`)

The `WebStandardAdapter` provides:
- Standard `Request`/`Response` body parsing
- `mapResponse` / `mapCompactResponse` for response serialization
- Fallback `listen()` using Bun-compatible API

### 2.3 Runtime Support Matrix

| Runtime | Adapter | Status |
|---------|---------|--------|
| Bun | `adapter/bun` | ✅ Primary, production |
| Node.js 22+ | `adapter/web-standard` | ✅ Supported |
| Deno | `adapter/web-standard` | ✅ Supported |
| Cloudflare Workers | `adapter/web-standard` | ✅ Supported |
| Vercel Edge | `adapter/web-standard` | ⚠️ Experimental |
| AWS Lambda | `adapter/web-standard` | ⚠️ Community |
| Netlify Edge | `adapter/web-standard` | ⚠️ Experimental |
| Fastly Compute | `adapter/web-standard` | ⚠️ Experimental |
| Browser (Service Worker) | `adapter/web-standard` | ⚠️ Experimental |

### 2.4 Architecture Diagram

```
┌──────────────────────────────────────────────────┐
│                   Elysia App                      │
│  new Elysia().get('/', handler).listen(3000)      │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────┐
│        ElysiaAdapter         │  ← src/adapter/types.ts
│  (interface: listen, parse,  │
│   response, fetch)           │
└──────────────┬───────────────┘
               │
     ┌─────────┴──────────┐
     ▼                    ▼
┌──────────┐     ┌────────────────┐
│ BunAdapter│     │WebStandardAdapter│
│ (bun only)│     │(node/deno/workers)│
└──────────┘     └────────────────┘
     │                    │
     ▼                    ▼
Bun.serve()        globalThis.fetch
(static routes,    (Web Standard)
 native WS)
```

---

## 3. API Changes from v1.x

### 3.1 Breaking Changes (30+ items)

The full changelog lists dozens of breaking changes. The most impactful ones:

#### Handler Argument Order (Schema-first)

```ts
// v1.x — handler, then schema
app.get('/user/:id', ({ params: { id } }) => id, {
  params: t.Object({ id: t.String() })
})

// v2.0 — schema, then handler
app.get('/user/:id', {
  params: t.Object({ id: t.String() })
}, ({ params: { id } }) => id)
```

This is the single biggest migration burden. Every route with a schema definition must reorder its arguments. Routes without schemas are unchanged.

#### Lifecycle Method Renames

```ts
// v1.x → v2.0
onRequest       → request
onParse         → parse
onTransform     → transform
onBeforeHandle  → beforeHandle
onAfterHandle   → afterHandle
onAfterResponse → afterResponse
onError         → error
```

The `on` prefix was dropped. This is cosmetic but affects every plugin and middleware.

#### Removed Features

| Feature | v1.x | v2.0 Replacement | Migration |
|---------|------|-------------------|-----------|
| `resolve()` | `.resolve(fn)` | `.derive(fn)` | Rename |
| `set.redirect` | `set.redirect = '/'` | `redirect('/')` helper | Replace |
| `response` in mapResponse | `ctx.response` | `ctx.responseValue` | Rename |
| `NotFoundError` | Class name | `NotFound` | Rename |
| `t.Transform` | Schema type | `t.Codec` | Rename |
| `t.Recursive` | Schema type | `t.Ref` self-reference | Replace |
| `t.Not`, `t.RegExp` | Schema types | `t.String({ pattern })` | Replace |
| Scoped scope | `{ as: 'scoped' }` | `'plugin'` string | Replace string |
| `.mount()` | Instance mounting | `.use()` | Replace |
| `.route()`, `.connect()`, `.env()` | Instance methods | Removed | Use explicit methods |
| OnError with class | `.onError(Error, fn)` | `.error(Error, fn)` | Rename |
| `config.encodeSchema` | Config option | Always enabled | Remove |
| ArrayQuery | Internal | Removed | N/A |
| Numeric/Integer/ObjectString/BooleanString formats | `t.Numeric()` etc. | Removed | Use `t.Number()` with codec |

#### Behavior Changes

| Change | Description |
|--------|-------------|
| **Guard override by default** | `.guard()` OVERRIDES inherited schemas by default. Additive requires `schema: 'standalone'` opt-in |
| **derive after validation** | `.derive()` now runs in `beforeHandle` (after validation), not before |
| **Production error hiding** | Errors with status >= 500 show `Internal Server Error` instead of raw message in production |
| **Response pass-through** | Returned `Response` objects pass through by reference when `set` is unchanged |
| **Cookie signing** | Always uses `secrets[0]` as active key. `null` at index 0 throws |
| **Static routes + hooks** | Static-value routes with `mapResponse` or schema fall through to JS path |

### 3.2 New Features

| Feature | API | Description |
|---------|-----|-------------|
| **Cookie schema field** | `t.Cookie(schema, opts)` | Per-field cookie attributes/secrets |
| **File type detection** | `t.File({ type })` | Content-detection with property path in errors |
| **Sub-type validator** | Internal | Shared validator caching for subtypes |
| **Validator pre-compute** | Internal | Pre-computes defaults for safe schemas (eliminates per-request walk) |

### 3.3 Type System Improvements

The v2.0 changelog contains **extensive type fixes** and improvements:

- `.derive()` / `.resolve()` context inference restored — resolved properties flow into handler/Eden types
- `.guard()` schema inference restored — standalone schemas accumulate; scoped schemas propagate correctly
- Guard `response` schemas now intersect with route's own response per status code
- Lifecycle hooks now infer scope-aware `params`
- WebSocket routes are now typed (`ElysiaWS` with `body`/`params`/`query` inference)
- Macro lifecycle handlers are typed (macro's own `beforeHandle` sees macro's own schema)
- `t.Form()` works as request `body` (multipart with type inference)
- Eden Treaty response types now include WebSocket subscribe types
- Tree-shakable TypeBox via bridge pattern
- `import { Elysia } from 'elysia/base'` is TypeBox-free (~8ms cold import)

---

## 4. Type System Overhaul (Sucrose)

A notable new module is `src/sucrose.ts` (762 lines). Sucrose appears to be a **type-level parameter extraction and analysis engine** — it handles:

- Extracting main parameters from handler function signatures
- Finding alias names in TypeScript AST
- Inferring body references from parameter destructuring
- Query parameter type inference
- Bracket pair range analysis
- Separating function signatures

The `src/compile/aot.ts` (681 lines) module handles AOT (Ahead-of-Time) compilation — pre-compiling route handlers into optimized JavaScript at app construction time rather than per-request. This is:

- **Handler compilation** — transforms handler functions into optimized code
- **Validator compilation** — pre-compiles TypeBox schemas into fast validation functions
- **Branch tables** — creates lookup tables for static route dispatch
- **Code stripping** — removes unused schema code from bundle

The `src/compile/handler/jit.ts` (941 lines) handles JIT (Just-in-Time) compilation — compiling handlers at cold-start time then caching the results.

---

## 5. WebSocket Reconstruction

The commit message is `:tada: feat: ws schema reconstruct` — WebSocket reconstruction is the headline feature.

### v2.0 WS Architecture

```
src/ws/
├── context.ts    (325 lines) — ElysiaWS class, connection data, generator handling
├── index.ts      (33 lines)  — barrel exports
├── parser.ts     (106 lines) — WS message parsing
├── route.ts      (648 lines) — WS route builder, upgrade handler, lifecycle
└── types.ts      (273 lines) — WS type definitions
```

### Key WS Improvements

| Feature | v1.x | v2.0 |
|---------|------|------|
| **Schema validation** | None | `body: t.Object(...)` for WS messages |
| **Type inference** | `any` | `ws.body` typed from schema |
| **Eden integration** | None | WS routes visible in Eden types |
| **Lifecycle hooks** | Basic | `open`, `message` (object+fn forms), `close`, `drain`, `ping`, `pong` |
| **Response validation** | None | `response: { 200, 400 }` for WS returns |
| **Generator support** | Limited | Full async-generator stream support via `yield` |
| **Schema reconstruct** | None | The headline feature — WS schema reconstruction pipeline |

### WS in v2.0

```ts
// v2.0 WebSocket with schema (new)
app.ws('/chat', {
  body: t.Object({ text: t.String() }),
  response: { 200: t.Object({ reply: t.String() }) },
  message(ws) {
    // ws.body is typed as { text: string }
    return ws.status(200, { reply: `Echo: ${ws.body.text}` })
  }
})

// Or with 3-arg form (schema, handler)
app.ws('/stream', {
  body: t.Object({ id: t.Number() })
}, function* (ws) {
  yield { tick: 1 }
  yield { tick: 2 }
})
```

---

## 6. Build & Distribution

### 6.1 Build Pipeline

v2.0 migrated from `bun build` to **tsdown** (a modern TypeScript bundler):

```ts
// build.ts
import { build } from 'tsdown'

await build({
  outDir: 'dist',
  entry: ['src/**/*.ts'],
  target: 'node22',
  format: ['esm', 'cjs'],
  minify: false,
  unbundle: true,
  dts: true,                    // Type declarations
  outExtensions({ format }) {
    return {
      dts: '.d.ts',
      js: format === 'es' ? '.mjs' : '.js'
    }
  }
})
```

### 6.2 Output Structure

The build produces 46 files in `dist/`, totaling ~705KB:

```
dist/
├── base.{js,mjs,d.ts}         ← Core Elysia class (6.8K source)
├── adapter/
│   ├── index.{js,mjs,d.ts}    ← Adapter factory
│   ├── types.{js,mjs,d.ts}    ← Adapter types
│   ├── bun/
│   │   ├── index.{js,mjs,d.ts}    ← Bun adapter
│   │   └── router.{js,mjs,d.ts}   ← Bun router
│   └── web-standard/
│       ├── index.{js,mjs,d.ts}    ← Web standard adapter
│       └── handler.{js,mjs,d.ts}  ← Response mapping
├── ws/                        ← WebSocket modules
├── type/                      ← Type system modules
├── compile/                   ← AOT/JIT compilation
├── cookie/                    ← Cookie handling
├── universal/                 ← Cross-runtime utilities
├── plugin/                    ← Build plugins (vite, esbuild, bun)
└── ... (46 files total)
```

### 6.3 Package.json Exports

The package exposes 32 entry points, including tree-shakeable sub-paths:

```json
{
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.mjs" },
    "./base": { "types": "./dist/base.d.ts", "import": "./dist/base.mjs" },
    "./adapter": { ... },
    "./ws": { ... },
    "./ws/types": { ... },
    "./type": { ... },
    "./type-system": { ... },
    "./universal/server": { ... },
    "./cookies": { ... },
    // ... 32 total entry points
  }
}
```

### 6.4 Dependencies

**Runtime dependencies (3 packages):**

| Package | Version | Purpose |
|---------|---------|---------|
| `deuri` | ^2.0.1 | URL parsing |
| `exact-mirror` | 1.2.2 | Schema mirroring for validation |
| `memoirist` | 1.1.0 | Trie-based router |

**Peer dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| `typebox` | >= 1.2.16 | Schema validation library (tree-shakable) |
| `openapi-types` | >= 12.0.0 | OpenAPI type definitions |
| `typescript` | >= 5.7.0 | Macro inference requires TS 5.7+ |
| `@types/bun` | >= 1.3.0 | Bun type definitions |

---

## 7. Performance & Bundle Size

### 7.1 Bundle Size Improvements

| Scenario | v1.x | v2.0 | Improvement |
|----------|------|------|-------------|
| `import { Elysia }` (main barrel) | ~737KB | ~204KB | **72% reduction** |
| `import { Elysia } from 'elysia/base'` | ~60ms cold import | ~8ms cold import | **7.5x faster** |
| Full app with schemas | ~737KB | unchanged | Same (TypeBox needed) |

The tree-shaking is achieved through:
- A bridge pattern in `src/type/bridge.ts` — `Elysia` class holds no static reference to TypeBox
- `import { Elysia } from 'elysia/base'` is completely TypeBox-free
- TypeScript 5.7+ macro inference doesn't require TypeBox at runtime

### 7.2 Runtime Performance

| Metric | v1.x | v2.0 (projected) |
|--------|------|-------------------|
| Pure routing (Bun) | ~2.5M req/s | ~2.5M req/s (similar) |
| Static route dispatch | Bun native | Bun native (improved) |
| Validation hot path | Per-request | Pre-computed defaults |
| Cold start (base) | ~60ms | ~8ms |
| Cold start (full) | ~200ms | ~150ms (estimated) |

---

## 8. Migration Guide (v1.x → v2.0)

### Step 1: Handler Arguments

```diff
- app.get('/user/:id', ({ params: { id } }) => id, {
-   params: t.Object({ id: t.String() })
- })
+ app.get('/user/:id', {
+   params: t.Object({ id: t.String() })
+ }, ({ params: { id } }) => id)
```

Routes without schemas are unchanged:
```ts
app.get('/ping', () => 'pong')  // OK, no change
```

### Step 2: Lifecycle Methods

```diff
- app.onRequest(handler)
- app.onParse(handler)
- app.onBeforeHandle(handler)
- app.onAfterHandle(handler)
- app.onAfterResponse(handler)
- app.onError(handler)
+ app.request(handler)
+ app.parse(handler)
+ app.beforeHandle(handler)
+ app.afterHandle(handler)
+ app.afterResponse(handler)
+ app.error(handler)
```

### Step 3: Deprecated Replacements

```diff
- import { NotFoundError } from 'elysia'
+ import { NotFound } from 'elysia'

- set.redirect = '/'
+ return redirect('/')

- ctx.response
+ ctx.responseValue

- app.resolve(fn)
+ app.derive(fn)

- app.guard({ as: 'scoped', ... })
+ app.guard('plugin', { ... })

- t.Transform(...)
+ t.Codec(...)

- t.Recursive(...)
+ t.Ref(...)    // self-reference

- t.Not(...)
+ // Use t.String({ pattern: ... })

- t.RegExp(...)
+ t.String({ pattern: '...' })
```

### Step 4: Guards and Grouping

```diff
- // v1: mixed semantics between forms
- app.guard({ body: t.String() }, (sub) => sub.get('/', handler))

- // v2: every guard defaults to OVERRIDE
+ app.guard({ body: t.String(), schema: 'standalone' }, (sub) => sub.get('/', handler))
```

### Step 5: WebSocket

```diff
- app.ws('/ws', {
-   message(ws, message) { ... }
- })
+ app.ws('/ws', {
+   message(ws) { ... }   // body auto-parsed from message
+ })
```

### Step 6: Cookie

```diff
- app.get('/', ({ cookie }) => cookie, { sign: ['token'] })
+ app.get('/', ({ cookie }) => cookie, {
+   cookie: t.Cookie({ token: t.String() }, { sign: true })
+ })
```

---

## 9. Stability Assessment

### 9.1 Strengths

| Strength | Detail |
|----------|--------|
| **Active development** | 30+ commits in June 2026, frequent releases (v1.4.x → v2.0-exp.8) |
| **Comprehensive test suite** | 460 files, 100+ test files covering AOT, WS, cookie, types, Edge |
| **Cloudflare Workers test** | Dedicated test directory (`test/cloudflare/`) with wrangler config |
| **Type system** | Extensive type-level tests (`test/types/` — 3,200+ lines) |
| **AGENTS.md / CLAUDE.md** | AI-ready documentation for development assistance |
| **Single maintainer track record** | saltyaom has maintained Elysia for 4+ years (2022–2026) |

### 9.2 Risks

| Risk | Severity | Detail |
|------|----------|--------|
| **Pre-release** | 🔴 Critical | `2.0.0-exp.8` — experimental, not RC |
| **30+ breaking changes** | 🔴 Critical | Every v1.x plugin and app needs migration |
| **No migration tool** | 🟡 Moderate | No codemod or automated migration script |
| **Single maintainer** | 🟡 Moderate | saltyaom is the sole committer |
| **Documentation lag** | 🟡 Moderate | Website still shows v1.x API |
| **Community plugin incompatibility** | 🟡 Moderate | All community plugins built for v1.x API |
| **Squashed commit** | 🟢 Low | Only 1 commit on kiana — hard to trace iterative changes |

### 9.3 Risk Comparison: Elysia v2.0 vs Bunigniter v0.9

| Risk Factor | Elysia v2.0-exp.8 | Bunigniter v0.9.13 |
|-------------|-------------------|-----------------|
| **Project age** | 4+ years | 3 months |
| **Maintainer count** | 1 (saltyaom) | 1 (kabyeon) |
| **GitHub stars** | ~18,400 | Unknown |
| **npm downloads** | ~500K/week | Unknown |
| **Release stage** | Experimental | Pre-v1.0 |
| **API stability** | Breaking changes expected | Breaking changes expected |
| **Documentation** | Excellent (v1.x), missing (v2.0) | 138 bilingual files |
| **Production users** | Thousands (v1.x) | Zero |

Elysia v2.0 is more mature as a project but **equally unstable for new development**. Both are pre-1.0 with breaking change risk.

---

## 10. Timeline & Recommendations

### 10.1 Estimated Release Timeline

| Stage | Version | Estimated Date |
|-------|---------|----------------|
| Current | `2.0.0-exp.8` | June 2026 |
| Release Candidate | `2.0.0-rc.1` | Q3 2026 (Jul–Aug) |
| Stable Release | `2.0.0` | Q3–Q4 2026 (Aug–Oct) |
| Ecosystem migration | Plugin updates | Q4 2026–Q1 2027 |

### 10.2 Recommendations

| Scenario | Recommendation | Rationale |
|----------|---------------|-----------|
| **New project (Bun-only)** | Start with **v1.4.28** (stable), plan migration to v2.0 after RC | v2.0 is too unstable for production |
| **New project (need CF Workers)** | Use v2.0-exp.8 with caution, or choose Hono | Edge support is experimental in v2.0 |
| **Existing v1.x app** | Wait for v2.0 RC, then migrate | 30+ breaking changes — one migration, not iterative |
| **Plugin author** | Start reading v2.0 changelog, prepare dual-support PRs | The adapter system changes everything |
| **Learning/Prototyping** | v2.0-exp.8 is fine | API surface is set; behavior changes are minor |

### 10.3 Why v2.0 Matters for Bunigniter

The `kiana` branch proves that **Elysia is evolving in exactly the direction Bunigniter needs**:

1. **Multi-runtime** — No longer Bun-only. Same destination as Bunigniter (Bun + Edge)
2. **Type safety** — Sucrose engine and AOT compilation are unique advantages over Hono
3. **Tree-shaking** — TypeBox-free base import for minimal bundle
4. **WebSocket with schemas** — First-class WS type safety, not an afterthought
5. **Adapter pattern** — Clean separation that makes it easy to add custom runtimes

The gap between "using Elysia" and "building Bunigniter on Elysia" has narrowed significantly with v2.0. The adapter system means Bunigniter can add its CodeIgniter-style `Controller` base class, session, view engine, and other modules **as Elysia plugins** rather than as a separate framework layer.

---

## References

- Source: `github.com/elysiajs/elysia` branch `kiana` (commit 42d227e)
- Changelog: `CHANGELOG.md` (4,061 lines)
- Adapter types: `src/adapter/types.ts`
- WebSocket: `src/ws/`
- Sucrose engine: `src/sucrose.ts`
- AOT compilation: `src/compile/aot.ts`
- Previous stable: v1.4.28 (March 2026)
