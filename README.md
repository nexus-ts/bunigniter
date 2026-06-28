# NexusTS

**Bun-native fullstack framework — CodeIgniter spirit × Elysia v2 performance × Edge-ready**

```bash
bun run examples/todo-app/dev.ts      # Todo app (React SSR)  :3000
bun run examples/hn-app/dev.ts         # Hacker News clone     :3000
bun run examples/petstore/dev.ts       # Pet Store + cart      :3000
bun run examples/blog-app-html/dev.ts  # Blog CMS (Rendu)      :3001
bun run examples/blog-app-tsx/dev.ts   # Blog CMS (React SSR)  :3002
```

---

## Why NexusTS?

PHP developers (CodeIgniter, Laravel) moving to TypeScript face a wall: NestJS is over-engineered, Hono is too bare, AdonisJS is Node-only. **NexusTS is the bridge.**

```ts
// routes/users.ts — file path = URL
import { Controller } from '@nexusts/core'

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
    const v = this.validate(this.body, { name: 'required|min:2', email: 'required|email' })
    if (v.fails()) return this.badRequest(v.errors)
    await this.db.insert('users', { name: v.data.name, email: v.data.email })
    return this.json({ ok: true }, 201)
  }
}
```

---

## Quick Start

```bash
git clone https://github.com/nexus-ts/framework.git
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
| **CLI** | 25 artisan-style commands (`make:*`, `db:*`, `key:generate`, `storage:link`) |
| **Realtime** | WebSocket (`ws.handle`, rooms, broadcast), SSE (`sse(ctx, send)`) |
| **Middleware** | Logger, Rate limiter, CORS, CSRF, Timing, Auth |
| **Services** | Cache, Queue, Upload, Mail (SMTP/File/Null), Image manipulation, HTTP client |
| **Security** | CSRF tokens, Rate limiting, JWT, Session encryption (AES-256-GCM + HMAC) |
| **Edge** | Cloudflare Workers, Deno, pre-built routes (`nx build:edge`) |
| **CLI Tools** | REPL console, Route list, Scaffolding (25 commands), Key generation |
| **Debug** | Debug toolbar with SQL profiling, session viewer, request headers, timing |

---

## Feature Comparison

| Capability | NexusTS | NestJS | AdonisJS | Hono |
|------------|:-------:|:------:|:--------:|:----:|
| Bun-native runtime | ✅ | ❌ | △ | ✅ |
| Cloudflare Workers | ✅ | △ | ❌ | ✅ |
| TC39 standard decorators | ✅ | ❌ | ❌ | ❌ |
| PHP-style templates | ✅ | ❌ | △ | ❌ |
| CI-style query builder | ✅ | ❌ | ✅ | ❌ |
| JWT auth | ✅ | ✅ | ✅ | ❌ |
| WebSocket | ✅ | ✅ | ❌ | ✅ |
| SSE | ✅ | ❌ | ❌ | ✅ |
| HMVC modules | ✅ | ✅ | ❌ | ❌ |
| Multi-database | ✅ | ✅ | ✅ | ❌ |
| OpenAPI auto-docs | ✅ | ✅ | ❌ | ✅ |
| 25 CLI commands | ✅ | ✅ | ✅ | ❌ |
| REPL console | ✅ | ✅ | ✅ | ❌ |
| Debug toolbar | ✅ | ❌ | ❌ | ❌ |
| 33 bundle entry points | ✅ | ❌ | △ | ✅ |
| No reflect-metadata | ✅ | ❌ | ❌ | ✅ |
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

## CLI Reference (25 commands)

```bash
bun run nx                    # Show help
bun run nx list               # List all routes
bun run nx repl               # Interactive console
bun run nx make:controller    # Scaffold controller
bun run nx make:model         # Scaffold DB schema
bun run nx make:migration     # Create migration
bun run nx db:migrate         # Run migrations
bun run nx db:seed            # Run seeders
bun run nx db:rollback        # Rollback migration
bun run nx make:middleware    # Scaffold middleware
bun run nx make:test          # Scaffold test
bun run nx make:event         # Scaffold event class
bun run nx make:job           # Scaffold queue job
bun run nx make:mail          # Scaffold mail class
bun run nx make:policy        # Scaffold policy
bun run nx key:generate       # Generate APP_KEY
bun run nx storage:link       # Create storage symlink
bun run nx build:edge         # Build edge routes
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
| Template Engine | [docs/template-engine.md](docs/template-engine.md) |
| Database Query Builder | [docs/database.md](docs/database.md) |
| Multi-Database | [docs/multi-database.md](docs/multi-database.md) |
| HMVC Modules | [docs/hmvc-modules.md](docs/hmvc-modules.md) |
| OpenAPI | [docs/openapi.md](docs/openapi.md) |
| JWT Auth | [docs/jwt-auth.md](docs/jwt-auth.md) |
| WebSocket | [docs/websocket.md](docs/websocket.md) |
| SSE | [docs/sse.md](docs/sse.md) |
| CLI Reference | [docs/cli-reference.md](docs/cli-reference.md) |
| Helpers Reference | [docs/helpers.md](docs/helpers.md) |

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

MIT — 2026 NexusTS Contributors
