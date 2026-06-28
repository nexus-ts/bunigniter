# Bunigniter — Development Roadmap

**Last updated:** 2026-06-27
**Current version:** 0.1.0
**Base:** Elysia v2.0.0-exp.8 + Drizzle ORM + Bun

---

## Philosophy

> "CodeIgniter spirit × Elysia performance × Edge-ready."

Bunigniter targets PHP developers (especially CodeIgniter/Laravel background) migrating to the TypeScript/Bun ecosystem. The framework provides:

- **Familiar API** — `extends Controller`, `this.db.query()`, `this.json()`, file-path = URL
- **Zero lock-in** — Raw SQL access alongside type-safe Drizzle ORM
- **Edge-ready** — Deploy to Bun, Cloudflare Workers, Deno, Node.js via Elysia v2 adapters
- **Batteries included** — Session, auth, cache, queue, view engine as optional plugins

---

## Phase 1: Core Foundation (Current — Complete)

> A working web framework with the basic CodeIgniter developer experience.

| Feature | Status | Commit |
|---------|--------|--------|
| Elysia v2 integration (local build) | ✅ | `init` |
| Drizzle ORM wrapper with 5 dialects | ✅ | `init` |
| `Controller` base class (`this.db`, `this.json`, `this.body`, `this.redirect`) | ✅ | `init` |
| `Service` base class | ✅ | `init` |
| File-path auto-routing (`pages/` → `/api/...`) | ✅ | `init` |
| Raw SQL queries (`this.db.query('SELECT ?', [id])`) | ✅ | `init` |
| ACID transactions (`this.db.transaction()`) | ✅ | `init` |
| CRUD example (users page) | ✅ | `init` |
| Single config file (`config/app.ts`) | ✅ | `init` |
| Seed script (`db/seed.ts`) | ✅ | `init` |
| Health check endpoint (`GET /health`) | ✅ | `init` |

---

## Phase 2: Developer Experience (Weeks 1–2)

> Making the framework comfortable for PHP migrants.

### P2.1 — CLI Scaffolding

```
bun run bi make:controller User
  → pages/users.ts

bun run bi make:model User --columns 'name:string,email:string'
  → updates db/schema.ts

bun run bi make:migration create_users_table

bun run bi db:migrate
bun run bi db:seed
```

**Priority:** High
**Estimated effort:** 2–3 days
**Key decisions:** Use `commander` or bare `Bun.argv` parsing; mustache-lite templates.

### P2.2 — Input Validation

```ts
export class Users extends Controller {
  async create() {
    const v = this.validate(this.body, {
      name: 'required|min:2|max:100',
      email: 'required|email'
    })
    if (v.fails()) return this.badRequest(v.errors())

    await this.db.query('INSERT INTO users ...', [v.name, v.email])
    return this.json({ ok: true }, 201)
  }
}
```

Or Zod integration (TypeScript-first users):

```ts
import { z } from 'zod'

const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email()
})

export class Users extends Controller {
  async create() {
    const parsed = UserSchema.safeParse(this.body)
    if (!parsed.success) return this.badRequest(parsed.error.flatten())
    await this.db.query('INSERT INTO users ...', [parsed.data.name, parsed.data.email])
    return this.json({ ok: true }, 201)
  }
}
```

**Priority:** High
**Estimated effort:** 1–2 days
**Key decisions:** Support both string-rule validation (CodeIgniter-style) and Zod (TypeScript-style).

### P2.3 — Environment & Config

```ts
// config/app.ts
export default {
  port: env('PORT', 3000),
  db: {
    dialect: env('DB_DIALECT', 'bun-sqlite'),
    connection: {
      filename: env('DB_FILENAME', 'app.db')
    }
  },
  app: {
    key: env('APP_KEY'),
    debug: env('DEBUG', false)
  }
}

// .env
PORT=3000
DB_DIALECT=postgres
DATABASE_URL=postgres://user:pass@localhost:5432/mydb
APP_KEY=base64:abc123...
```

**Priority:** High
**Estimated effort:** 1 day
**Key decisions:** `.env` file loading with `process.env` fallback. All config values should support `env()` function.

### P2.4 — View/Template Engine

```ts
export class Pages extends Controller {
  async index() {
    const users = await this.db.query('SELECT * FROM users')
    return this.view('users/list', { users })
  }
}
```

Support multiple engines (user-configured in `config/app.ts`):
- **Rendu** (Bun-native, PHP-style `<?= ?>`) — default
- **Eta** (EJS-style `<%= %>`) — optional
- **Edge** (Adonis-style `{{ }}`) — optional

**Priority:** Medium
**Estimated effort:** 2–3 days
**Key decisions:** File extension auto-detection (`.html` → Rendu, `.eta` → Eta, `.edge` → Edge).

---

## Phase 3: Session & Auth (Weeks 2–3)

> Making stateful web applications possible (the CodeIgniter bread and butter).

### P3.1 — Session

```ts
export class Auth extends Controller {
  async login() {
    // Cookie-based session (no DB needed)
    this.session.set('user_id', 1)
    this.session.set('roles', ['admin'])
    return this.redirect('/dashboard')
  }

  async dashboard() {
    const userId = this.session.get('user_id')  // → 1
    const roles = this.session.get('roles')     // → ['admin']
    if (!userId) return this.redirect('/login')
    // ...
  }
}
```

Backends:
- **Cookie** (HMAC-signed, encrypted) — default, no DB
- **Drizzle** (PostgreSQL/MySQL/SQLite) — multi-pod, persistant
- **Redis** — high-performance

**Priority:** High
**Estimated effort:** 2–3 days

### P3.2 — Authentication

```ts
export class Users extends Controller {
  // Auto-protect with auth middleware
  async index() {
    return this.json(await this.db.query('SELECT id, name, email FROM users'))
  }
}

// Or per-method
export class Profile extends Controller {
  async show() {
    const user = this.auth.user()  // → current user from session/token
    return this.json(user)
  }
}
```

Providers:
- **Session-based** (email + password, bcrypt/argon2)
- **Token-based** (JWT or random tokens for API clients)
- **Social OAuth** (GitHub, Google, Kakao — via better-auth or custom)

**Priority:** High
**Estimated effort:** 3–5 days

---

## Phase 4: Middleware & Hooks (Week 3)

> Before/after hooks, error handling, CORS.

### P4.1 — Global Middleware

```ts
// config/app.ts
export default {
  middleware: {
    before: [
      'cors',
      'csrf',
      'auth'     // optional — applies to all routes by default
    ],
    after: [
      'logger'
    ]
  }
}
```

Built-in middleware:
- `cors` — Cross-Origin Resource Sharing
- `csrf` — CSRF token validation
- `auth` — Session/token authentication guard
- `logger` — Request logging
- `throttle` — Rate limiting
- `static` — Static file serving

**Priority:** Medium
**Estimated effort:** 2–3 days

### P4.2 — Per-Controller Middleware

```ts
export class Admin extends Controller {
  static middleware = ['auth', 'admin_only']

  async index() {
    return this.json(await this.db.query('SELECT * FROM settings'))
  }
}
```

**Priority:** Medium
**Estimated effort:** 1 day

---

## Phase 5: Elysia v2.0 Stable Migration (Q3 2026)

> When Elysia v2.0 stable ships.

| Step | Description | Risk |
|------|-------------|------|
| Update `package.json` dep to `elysia@^2.0.0` | Change file: path to npm version | Low |
| Audit adapter API changes | `BunAdapter` → `createAdapter` changes | Medium |
| Test all 5 DB dialects | Drizzle wrapper should be unaffected | Low |
| Update file-router if Elysia `get()` API changes again | Schema-first order confirmed stable | Low |
| Release Bunigniter v0.2.0 | First stable release on stable Elysia | — |

**Priority:** Low (blocked on Elysia v2.0 stable)
**Estimated effort:** 1–2 days

---

## Phase 6: Production Modules (Q3–Q4 2026)

> Making Bunigniter production-ready for real applications.

| Module | Priority | Estimated effort | Dependencies |
|--------|----------|-----------------|--------------|
| **Cache** (`this.cache.get/set`) | Medium | 2 days | Session (config patterns) |
| **Queue / Jobs** (`this.queue.dispatch`) | Medium | 3 days | DB (Drizzle) |
| **File Upload** (`this.file` / `this.request.files`) | Medium | 2 days | None |
| **Mail** (`this.mail.send()`) | Low | 2 days | None |
| **Rate Limiting** (`this.throttle()`) | Low | 1 day | Cache or Session |
| **Logging** (`this.log.info/error`) | Low | 1 day | None |
| **OpenAPI / Swagger** | Low | 3 days | Validation module |

---

## Phase 7: Testing & CI (Ongoing)

> Build quality assurance into the project from day one.

| Feature | When | Effort |
|---------|------|--------|
| Vitest test suite for core | Phase 2 | 2 days |
| Smoke test (boot + health check) | Phase 2 | 0.5 day |
| CRUD integration tests | Phase 2 | 1 day |
| GitHub Actions CI | Phase 2 | 0.5 day |
| Elysia v2 regression tests | Phase 5 | 1 day |
| 5-dialect DB tests | Phase 5 | 2 days |

---

## Phase 8: Edge Deployment (Q4 2026)

> Deploy the same codebase to Cloudflare Workers, Deno, Node.js.

```ts
// src/index.ts — works everywhere
import { Elysia } from 'elysia'
import { Bunigniter } from '../core'

const app = new Bunigniter()

// Bun
app.listen(3000)

// Cloudflare Workers
export default { fetch: app.fetch }

// Deno
Deno.serve(app.fetch)
```

**Dependencies:** Elysia v2.0 stable with mature adapter system.
**Estimated effort:** 2–3 days.

---

## Phase 9: Ecosystem (2027)

> Build the community and plugin ecosystem.

| Goal | How | Priority |
|------|-----|----------|
| **Documentation site** | GitHub Pages + VitePress | High |
| **Example apps** | Blog, e-commerce, admin panel | High |
| **npm publish** | `@nexus-ts/core`, `@nexus-ts/cli` | Medium |
| **Community plugins** | Plugin API docs + starter template | Medium |
| **Benchmarks** | Compare with Hono, NestJS, AdonisJS | Medium |
| **YouTube tutorials** | "CodeIgniter to Bunigniter migration" series | Low |

---

## Summary Timeline

```
Phase 1: Core Foundation      ████████░░  Complete
Phase 2: Developer Experience  ░░░░░░░░░░  Next (2 weeks)
Phase 3: Session & Auth        ░░░░░░░░░░  Week 2–3
Phase 4: Middleware & Hooks    ░░░░░░░░░░  Week 3
Phase 5: Elysia v2 Migration   ░░░░░░░░░░  Q3 2026 (blocked)
Phase 6: Production Modules    ░░░░░░░░░░  Q3–Q4 2026
Phase 7: Testing & CI          ░░░░░░░░░░  Ongoing
Phase 8: Edge Deployment       ░░░░░░░░░░  Q4 2026
Phase 9: Ecosystem             ░░░░░░░░░░  2027
```

---

## Current Focus

**Phase 2 — Developer Experience.** The next tangible goal is:

1. **CLI scaffolding** — `bi make:controller/model/migration`
2. **Validation** — String-rule validator + Zod integration
3. **Environment config** — `.env` loading + `env()` helper
4. **Smoke tests** — Boot + health check + CRUD round-trip
