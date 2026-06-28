# Bunigniter

**Bun-native fullstack framework — CodeIgniter spirit × Elysia v2 performance × Edge-ready**

```bash
bun run examples/todo-app/dev.ts      # Todo app (React SSR)  :3000
bun run examples/hn-app/dev.ts         # Hacker News clone     :3000
bun run examples/petstore/dev.ts       # Pet Store + cart      :3000
bun run examples/blog-app-html/dev.ts  # Blog CMS (Rendu)      :3001
bun run examples/blog-app-tsx/dev.ts   # Blog CMS (React SSR)  :3002
```

---

## Why Bunigniter?

PHP developers (CodeIgniter, Laravel) moving to TypeScript face a wall: NestJS is over-engineered, Hono is too bare, AdonisJS is Node-only. **Bunigniter is the bridge.**

```ts
// routes/users.ts — file path = URL
import { Controller } from 'bunigniter'

export class Users extends Controller {
  async index() {
    return this.json(await this.db.get('users'))
  }
  async show(id: number) {
    const user = await this.db.first('SELECT * FROM users WHERE id = ?', [id])
    if (!user) return this.notFound()
    return this.json(user)
  }
  async create() {
    const data = this.request.only(['name', 'email'])
    const v = this.validate(data, { name: 'required|min:2', email: 'required|email' })
    if (v.fails()) return this.badRequest(v.errors)
    await this.db.insert('users', { name: v.data.name, email: v.data.email })
    return this.json({ ok: true }, 201)
  }
}
```

---

## Quick Start

```bash
git clone https://github.com/nexus-ts/bunigniter.git
cd framework
bun install
bun run examples/todo-app/db/seed.ts
bun run examples/todo-app/dev.ts
# → http://localhost:3000
```

---

## Features

| Category | Features |
|----------|----------|
| **Core** | Controller, Service, DI, File-based routing, Void-style routing, HMVC modules |
| **Database** | SQLite/PostgreSQL/MySQL/D1, CI-style query builder, `db.get/insert/update/delete`, JOIN, pagination, transactions, multi-database |
| **Templates** | Rendu (PHP-style `<?= ?>`), MDX (Markdown + JSX), React SSR, Inertia protocol, auto-layouts, partial includes, named slots |
| **Auth** | Session-based auth, JWT (sign/verify/middleware), CSRF, CORS |
| **API** | OpenAPI 3.1 auto-spec, Scalar UI, `OpenAPIRegistry` for custom docs |
| **CLI** | 27 artisan-style commands (`make:*`, `db:*`, `key:generate`, `storage:link`), REPL console, Route list |
| **Realtime** | WebSocket (`ws.handle`, rooms, broadcast), SSE (`sse(ctx, send)`), Scheduler (cron) |
| **Middleware** | Logger, Rate limiter, CORS, CSRF, Timing, Auth |
| **Services** | Cache (TTL), Queue (in-memory, retry), Upload (validation), Mail (SMTP/File/Null), Image manipulation, HTTP client |
| **Security** | CSRF tokens, Rate limiting, JWT, Session encryption (AES-256-GCM + HMAC) |
| **Edge** | Cloudflare Workers, Deno, pre-built routes (`bi build:edge`) |
| **Debug** | Debug toolbar with SQL profiling, session viewer, request headers, timing |

---

## Feature Comparison

| Capability | Bunigniter | NestJS | AdonisJS | Hono |
|------------|:-------:|:------:|:--------:|:----:|
| Bun-native runtime | ✅ | ❌ | △ | ✅ |
| Cloudflare Workers | ✅ | △ | ❌ | ✅ |
| Class-based controllers (extends Controller) | ✅ | ✅ | ✅ | ❌ |
| File-path routing (no decorators needed) | ✅ | ❌ | ❌ | ✅ |
| PHP-style templates | ✅ | ❌ | △ | ❌ |
| CI-style query builder | ✅ | ❌ | ✅ | ❌ |
| JWT auth | ✅ | ✅ | ✅ | ❌ |
| WebSocket | ✅ | ✅ | ❌ | ✅ |
| SSE | ✅ | ❌ | ❌ | ✅ |
| HMVC modules | ✅ | ✅ | ❌ | ❌ |
| Multi-database | ✅ | ✅ | ✅ | ❌ |
| OpenAPI auto-docs | ✅ | ✅ | ❌ | ✅ |
| 27 CLI commands | ✅ | ✅ | ✅ | ❌ |
| REPL console | ✅ | ✅ | ✅ | ❌ |
| Debug toolbar | ✅ | ❌ | ❌ | ❌ |
| 19 bundle entry points | ✅ | ❌ | ❌ | ✅ |
| No build step required (Bun native) | ✅ | ❌ | ❌ | ✅ |
| Field injection | ✅ | ❌ | ❌ | ❌ |

---

## Architecture

```
routes/               ← Controllers & API handlers
  users.ts            ← CRUD controller
  sse.ts              ← Server-Sent Events
  ws.ts               ← WebSocket handlers
  schedule.ts         ← Cron tasks

views/                ← Templates
  _layout.html        ← Auto-layout (wraps all pages)
  welcome.html        ← Rendu (PHP-style <?= ?>)
  About.mdx           ← MDX (Markdown + variables)
  TodoList.tsx        ← React SSR component

modules/              ← HMVC modules (optional)
  blog/routes/        ← /blog/*
  shop/routes/        ← /shop/*
  admin/routes/       ← /admin/*

config/app.ts         ← Single config file
db/seed.ts            ← Database seeder
```

---

## CLI Reference (27 commands)

```bash
bun run bi                    # Show help
bun run bi list               # List all routes
bun run bi repl               # Interactive console
bun run bi make:controller    # Scaffold controller
bun run bi make:model         # Scaffold DB schema
bun run bi make:migration     # Create migration
bun run bi db:migrate         # Run migrations
bun run bi db:seed            # Run seeders
bun run bi db:rollback        # Rollback migration
bun run bi db:wipe            # Drop all tables
bun run bi make:seeder        # Scaffold seeder
bun run bi make:middleware    # Scaffold middleware
bun run bi make:command       # Scaffold CLI command
bun run bi make:test          # Scaffold test
bun run bi make:event         # Scaffold event class
bun run bi make:job           # Scaffold queue job
bun run bi make:mail          # Scaffold mail class
bun run bi make:listener      # Scaffold event listener
bun run bi make:provider      # Scaffold service provider
bun run bi make:policy        # Scaffold policy
bun run bi make:request       # Scaffold form request
bun run bi make:resource      # Scaffold API resource
bun run bi make:rule          # Scaffold validation rule
bun run bi key:generate       # Generate APP_KEY
bun run bi storage:link       # Create storage symlink
bun run bi build:edge         # Build edge routes
bun run bi edge:dev           # Run edge app locally
```

---

## Database

CodeIgniter-style query builder with 11 helper methods:

```ts
await db.insert('users', { name: 'Alice', email: 'a@b.com' })
await db.update('users', { name: 'Bob' }, { id: 1 })
await db.delete('users', { id: 1 })
await db.get('users', { role: 'admin' }, { orderBy: 'name', limit: 10 })
await db.getJoin('posts p', [['users u', 'u.id = p.user_id']], { where: { published: 1 } })
await db.count('users', { role: 'admin' })
await db.paginate('SELECT * FROM users', [], { page: 2, perPage: 20 })
await db.first('SELECT * FROM users WHERE id = ?', [1])
await db.sql\`SELECT * FROM users WHERE id = ${id}\`
await db.transaction(async (tx) => { ... })
```

Supports SQLite, PostgreSQL, MySQL, Cloudflare D1. WHERE operators: `=`, `>`, `<`, `>=`, `<=`, `<>`, `LIKE`, `IN`.

---

## Templates (3 Engines)

| Engine | File | Syntax | Example |
|--------|------|--------|---------|
| **Rendu** | `.html` | `<?= title ?>` | PHP-style |
| **MDX** | `.mdx` | `{{ title }}` + Markdown | Documentation pages |
| **React SSR** | `.tsx` | `{title}` (JSX) | Full component control |

Auto-layout: `views/_layout.html` wraps all pages automatically. Named slots: `<?= slot_sidebar ?? '' ?>`.

---

## Documentation

| Guide | File |
|-------|------|
| Controller Lifecycle | [docs/user-guide/controller-lifecycle.md](docs/user-guide/controller-lifecycle.md) |
| Request Input | [docs/user-guide/request.md](docs/user-guide/request.md) |
| Template Engine | [docs/user-guide/template-engine.md](docs/user-guide/template-engine.md) |
| Database | [docs/user-guide/database.md](docs/user-guide/database.md) |
| Multi-Database | [docs/user-guide/multi-database.md](docs/user-guide/multi-database.md) |
| HMVC Modules | [docs/user-guide/hmvc-modules.md](docs/user-guide/hmvc-modules.md) |
| OpenAPI | [docs/user-guide/openapi.md](docs/user-guide/openapi.md) |
| JWT Auth | [docs/user-guide/jwt-auth.md](docs/user-guide/jwt-auth.md) |
| WebSocket | [docs/user-guide/websocket.md](docs/user-guide/websocket.md) |
| SSE | [docs/user-guide/sse.md](docs/user-guide/sse.md) |
| CLI Reference | [docs/user-guide/cli-reference.md](docs/user-guide/cli-reference.md) |
| Helpers Reference | [docs/user-guide/helpers.md](docs/user-guide/helpers.md) |

---

## Example Apps

| App | Stack | Port | Features |
|-----|-------|:----:|----------|
| [Todo App](examples/todo-app) | React SSR | 3000 | CRUD, filters, search |
| [Hacker News](examples/hn-app) | Rendu HTML | 3000 | Auth, voting, comments |
| [Pet Store](examples/petstore) | Rendu HTML | 3000 | Cart, session, filters |
| [Blog CMS (HTML)](examples/blog-app-html) | Rendu HTML | 3001 | Posts, admin, comments |
| [Blog CMS (React)](examples/blog-app-tsx) | React SSR | 3002 | Posts, admin, comments |
| [Blog CMS (Inertia)](examples/blog-app-inertia-react) | Inertia React | 3003 | Posts, admin, comments |
| [HMVC Demo](examples/hmvc-app) | Rendu HTML | 3005 | Blog+Shop+Admin modules |

---

## License

MIT — 2026 Bunigniter Contributors
