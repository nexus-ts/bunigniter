> **⚠️ Experimental** — This framework is actively evolving. APIs may change before 1.0.

# Bunigniter

[![npm](https://img.shields.io/npm/v/bunigniter)](https://www.npmjs.com/package/bunigniter)
[![CI](https://github.com/nexus-ts/bunigniter/actions/workflows/ci.yml/badge.svg)](https://github.com/nexus-ts/bunigniter/actions)

**Bun-native fullstack framework — CodeIgniter's DX × Elysia v2 performance × Edge-ready.**

PHP/Laravel developers moving to TypeScript face a wall: NestJS over-engineers, Hono is too bare, AdonisJS is Node-only. **Bunigniter is the bridge.**

---

## Install

> ⚠️ **Always use `@latest`** — Bun caches `create-*` packages locally. Without `@latest`,
> you may install an older scaffold. The scaffold template and the framework are
> published as separate packages; keep both in sync.

```bash
# Recommended — full scaffold (always get the latest)
bun create bunigniter@latest my-app

# Alternative — same result
bunx create-bunigniter@latest my-app

# Add to existing project:
bun add bunigniter
bun run bi init          # Scaffold into current dir (merges package.json)
```

> New to Bunigniter? `bun create bunigniter@latest my-app` scaffolds a ready-to-run
> project with interactive prompts — runtime, database, templates.

---

## One controller, everything you need

```ts
// routes/users.ts — file path = URL
export class Users extends Controller {
  async index()  { return this.json(await this.db.get('users')) }
  async show(id) { return this.json(await this.db.first('SELECT * FROM users WHERE id = ?', [id])) }

  async create() {
    const data = this.request.only(['name', 'email'])
    const v = this.validate(data, { name: 'required|min:2', email: 'required|email' })
    if (v.fails()) return this.badRequest(v.errors)
    await this.db.insert('users', { name: v.data.name, email: v.data.email })
    return this.json({ ok: true }, 201)
  }
}
```

No decorators. No DI containers. No boilerplate. Just `this.db`, `this.request`, `this.validate()` — all auto-injected.

---

## Features

| Category | Highlights |
|----------|-----------|
| **Core** | Class-based controllers, file-path routing, handler-style routes, HMVC modules |
| **DB** | SQLite/PostgreSQL/MySQL/D1 — CI-style `get/insert/update/delete`, pagination, multi-db |
| **Templates** | Rendu (PHP `<?= ?>`), MDX, React SSR, auto-layout, named slots |
| **Auth** | Session auth, JWT (HS256/RS256), CSRF, CORS |
| **API** | OpenAPI 3.1 auto-docs with Scalar UI |
| **CLI** | 27 artisan-style commands: `make:controller`, `db:migrate`, `key:generate`, `repl`, `list` |
| **Realtime** | WebSocket (rooms, broadcast), SSE, cron scheduler |
| **Middleware** | Logger, rate limiter, CORS, CSRF, timing |
| **Services** | Cache (TTL), queue (retry), upload (validation), mail, image (sharp), HTTP client |
| **Security** | AES-256-GCM session encryption + HMAC, CSRF, rate limiting, JWT |
| **Edge** | Cloudflare Workers, Deno — `bun run bi build:edge` |
| **Debug** | Toolbar with SQL profiling, session viewer, request headers |

---

## Quick Start

```bash
# Clone & explore
git clone https://github.com/nexus-ts/bunigniter.git
cd bunigniter && bun install

# Pick an example — all working out of the box
bun run examples/simple-app/dev.ts    # Welcome page  :3000  ← simplest
bun run examples/todo-app/dev.ts      # React SSR    :3000
bun run examples/slack-app/dev.ts     # Full-stack    :3000  ← recommended
bun run examples/hn-app/dev.ts        # Rendu HTML    :3000
bun run examples/petstore/dev.ts      # Rendu HTML    :3000
```

Slack clone covers every feature: auth, uploads, images, WebSocket, sessions, CLI seeding.

---

## Architecture

```
routes/              ← Controllers + handlers — file path = URL
  users.ts
  ws.ts              ← WebSocket
  sse.ts             ← Server-Sent Events
views/               ← Templates (3 engines)
  _layout.html       ← Auto-wraps all pages
config/app.ts        ← Single config file
modules/             ← HMVC sub-apps
middleware/          ← Global middleware
```

---

## In action

```ts
// Database — CI-style query builder
await this.db.insert('items', { title: 'Hello' })
await this.db.getJoin('posts p', [['users u', 'u.id=p.user_id']])
await this.db.paginate('SELECT * FROM items', [], { page: 2 })

// Auth — one line
this.auth.user()           // current user
this.auth.login(user)      // start session
this.auth.logout()         // clear session
```

---

## CLI Reference

```bash
bun run bi                    # Help
bun run bi list               # List routes
bun run bi new                # Interactive project scaffold (new directory)
bun run bi init               # Interactive scaffold into current dir
bun run bi repl               # Interactive console
bun run bi make:controller    # Scaffold controller, model, migration, middleware, ...
bun run bi db:migrate         # Run/rollback/seed/wipe
bun run bi key:generate       # Generate APP_KEY
bun run bi storage:link       # Create public storage symlink
bun run bi build:edge         # Build for Cloudflare Workers
```

28 commands total. All in `bun run bi list`.

---

## Documentation

| Topic | File |
|-------|------|
| Controller, Request, Validation | `docs/user-guide/controller-lifecycle.md`, `request.md` |
| Templates (3 engines) | `docs/user-guide/template-engine.md` |
| Database, Multi-DB | `docs/user-guide/database.md`, `multi-database.md` |
| Auth (Session + JWT) | `docs/user-guide/jwt-auth.md` |
| WebSocket, SSE | `docs/user-guide/websocket.md`, `sse.md` |
| CLI, Helpers | `docs/user-guide/cli-reference.md`, `helpers.md` |
| HMVC, OpenAPI | `docs/user-guide/hmvc-modules.md`, `openapi.md` |

---

## Template Engines — Three Ways to Render

| Engine | File | Syntax | Best For |
|--------|------|--------|----------|
| **Rendu** | `.html` | `<?= title ?>`, `<? if(...) { ?>` | PHP/Laravel developers, designers |
| **MDX** | `.mdx` | `{{ title }}` / `<?= title ?>` + Markdown | Documentation, content sites |
| **React SSR** | `.tsx` | `{title}` (JSX) | Complex UI, component libraries |

All three support **auto-layout** (`views/_layout.html` → `<?= slot ?>`), **named slots**, and **nested templates**.
No build step required — Bun serves `.html`/`.mdx`/`.tsx` directly.

```html
{{! Rendu (.html) — PHP-style, familiar for Laravel/CI devs }}
<h1><?= title ?></h1>
<? for (const item of items) { ?>
  <li><?= item.name ?> — <?= item.price ?>$</li>
<? } ?>
```

```mdx
{{! MDX (.mdx) — Markdown + variables, great for docs }}
# {{ title }}

**Stats:** {{ total }} items ({{ active }} active)

![Diagram]({{ diagramUrl }})

{{! Also supports Rendu syntax for inline logic }}
<? if (user) { ?>Welcome, **{{ user.name }}**<? } ?>
```

```tsx
{{! React SSR (.tsx) — JSX for complex UIs }}
export default function Items({ items }: { items: Item[] }) {
  return (
    <div>
      <h1>{title}</h1>
      {items.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
```

---

## Example Apps

| App | Stack | Port |
|-----|-------|:----:|
| [Simple App](examples/simple-app) | Rendu HTML (CI3 welcome) | 3000 |
| [Todo App](examples/todo-app) | React SSR | 3000 |
| [Hacker News](examples/hn-app) | Rendu HTML | 3000 |
| [Pet Store](examples/petstore) | Rendu HTML | 3000 |
| [Blog CMS](examples/blog-app-html) | Rendu HTML | 3000 |
| [Blog CMS (React)](examples/blog-app-tsx) | React SSR | 3000 |
| [Blog CMS (Inertia)](examples/blog-app-inertia-react) | Inertia React | 3000 |
| [HMVC Demo](examples/hmvc-app) | Rendu HTML | 3000 |

---

## License

MIT — 2026 Bunigniter Contributors
