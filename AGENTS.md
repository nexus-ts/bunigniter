# Bunigniter — Development Guide

Bun-native fullstack framework. CodeIgniter spirit × Elysia v2 × Edge-ready.

> 90+ commits, 85+ source files, 15 docs, 8 example apps.
> GitHub: github.com/nexus-ts/bunigniter

---

## Repository Structure

```
routes/        ← Controllers (Export class extends Controller)
views/         ← Templates (.html Rendu / .mdx / .tsx React)
modules/       ← HMVC modules (blog/shop/admin)
config/app.ts  ← Single config file
middleware/    ← Global middleware (01_*.ts)
src/helpers/   ← 25 helper modules
src/cli/       ← 28 CLI commands
docs/
├── user-guide/  ← 13 user-facing docs
└── analysis/   ← 3 analysis docs
examples/      ← 8 example apps
```

## Key Conventions (MUST FOLLOW)

1. **Controllers go in `routes/`** — NOT `pages/` or `controllers/`
2. **Import from `bunigniter`** — NOT relative paths like `../../src/`
3. **View files in `views/`** — NOT `routes/`
4. **HMVC modules in `modules/<name>/routes/`** — with their own views/
5. **All `make:*` templates share `src/cli/templates.ts`** — single source of truth for scaffolding commands
6. **Project scaffold templates in `src/cli/scaffold.ts`** — single source of truth for `bi new`
7. **Docs in English + Korean** — both files simultaneously

## Creating a Controller

```ts
// routes/posts.ts
import { Controller } from 'bunigniter'

export class Posts extends Controller {
  async index() { return this.json(await this.db.get('posts')) }
  async show(id: number) { return this.json(await this.db.first('SELECT * FROM posts WHERE id = ?', [id])) }
  async create() {
    const data = this.request.only(['title', 'content'])
    const v = this.validate(data, { title: 'required' })
    if (v.fails()) return this.badRequest(v.errors)
    await this.db.insert('posts', { title: v.data.title })
    return this.json({ ok: true }, 201)
  }
}
```

## Route Method Mapping

| Method | Route | Description |
|--------|-------|-------------|
| `index()` | `GET /posts` | List all |
| `show(id)` | `GET /posts/:id` | Get one |
| `create()` | `POST /posts` | Create |
| `update(id)` | `PUT /posts/:id` | Replace |
| `destroy(id)` | `DELETE /posts/:id` | Delete |

## Request Input (CI-style)

```ts
this.request.input(key, default?)  // POST + GET merged
this.request.get(key, default?)    // query string only
this.request.post(key, default?)   // POST body only
this.request.only(keys)            // mass-assignment protection
this.request.has(key)              // existence check
this.request.filled(key)           // non-empty check
this.request.method()              // HTTP method
this.request.isAjax()              // AJAX detection
this.request.ip()                  // client IP
this.request.boolean(key)          // boolean cast
this.request.integer(key)          // integer cast
this.request.json(key?)            // JSON dot-notation
this.request.bearerToken()         // Bearer token
this.request.cookie(key)           // cookie value
this.request.server(key)           // server variable
this.request.userAgent()           // User-Agent string
```

## API Handler (Void-style)

```ts
// routes/hello.ts
import { defineHandler } from 'bunigniter'

export const GET = defineHandler(async () => ({ message: 'Hello' }))
export const POST = defineHandler.withValidator({
  body: z.object({ name: z.string() })
})(async (c, { body }) => ({ received: body.name }))
```

## Database Helpers (CI-style)

```ts
db.get('users', { role: 'admin' }, { orderBy: 'name', limit: 10 })  // SELECT
db.getJoin('posts p', [['users u', 'u.id=p.user_id']])                // JOIN
db.insert('users', { name: 'Alice' })                                 // INSERT
db.update('users', { name: 'Bob' }, { id: 1 })                        // UPDATE
db.delete('users', { id: 1 })                                         // DELETE
db.count('users', { role: 'admin' })                                  // COUNT
db.paginate('SELECT * FROM users', [], { page: 2 })                   // PAGINATION
db.sql\`SELECT * FROM users WHERE id = ${id}\`                        // TAGGED TEMPLATE
```

WHERE operators: `=`, `>`, `<`, `>=`, `<=`, `<>`, `LIKE`, `IN`
Multi-db: `this.dbs.analytics.get('stats')`

## Templates

| Type | File | Syntax | Use For |
|------|------|--------|---------|
| Rendu | `.html` | `<?= title ?>`, `<? if(...) { ?>` | PHP developers |
| MDX | `.mdx` | `{{ title }}` + Markdown | Docs, content pages |
| React SSR | `.tsx` | `{title}` (JSX) | Complex UI |

Auto-layout: `views/_layout.html` → `<?= slot ?>` wraps all pages.

## Auth

```ts
// Session-based
this.auth.user()     // → current user object
this.auth.login(u)   // → set session
this.auth.logout()   // → clear session

// JWT
import { jwt } from 'bunigniter/helpers/jwt'
const token = jwt.sign({ userId: 1 })
const payload = jwt.verify(token)

// Controller guard
protected _before() {
  if (!this.auth.check()) return this.redirect('/login')
}
```

## WebSocket & SSE

```ts
// routes/ws.ts
import { ws } from 'bunigniter/helpers/ws'
ws.handle('/ws/chat', { message(ws, data) { ws.publish('chat', data) } })

// routes/sse.ts
import { sse } from 'bunigniter/helpers/sse'
export const GET = defineHandler(async (ctx) => sse(ctx, (send) => {
  send({ event: 'tick', data: { count: 1 } })
}))
```

## CLI

```bash
bun run bi <command>
```

Available: `new`, `init`, `make:controller`, `make:model`, `make:migration`, `db:migrate`, `db:rollback`, `db:seed`, `db:wipe`, `key:generate`, `make:middleware`, `make:test`, `make:command`, `make:job`, `make:mail`, `make:event`, `make:listener`, `make:provider`, `make:policy`, `make:request`, `make:resource`, `make:rule`, `storage:link`, `build:edge`, `edge:dev`, `list`, `repl`.

## Example Apps

| Command | App | Stack |
|---------|-----|-------|
| `examples/simple-app/dev.ts` | Simple (CI3 welcome) | Rendu HTML |
| `examples/todo-app/dev.ts` | Todo | React SSR |
| `examples/hn-app/dev.ts` | Hacker News | Rendu HTML |
| `examples/petstore/dev.ts` | Pet Store | Rendu HTML |
| `examples/blog-app-html/dev.ts` | Blog CMS | Rendu HTML |
| `examples/blog-app-tsx/dev.ts` | Blog CMS | React SSR |

## Testing

```bash
bun run test              # 39 tests
bun x vitest run tests/   # Vitest suite
```

## Documentation

See `docs/user-guide/` and `docs/analysis/` — 16 files covering all features.

## Skills

See `skills/` directory for focused development guides.

| Skill | Description |
|-------|-------------|
| [Bun APIs](skills/bun-apis.md) | Bun built-in APIs: Bun.CSRF, Bun.CryptoHasher, Bun.password, etc. |
| [Controller](skills/controller.md) | Creating routes with Controller + Request input API |
| [Database](skills/database.md) | CI-style query builder |
| [Auth](skills/auth.md) | Session & JWT authentication |
| [Templates](skills/templates.md) | Rendu / MDX / React SSR |
| [CLI](skills/cli.md) | CLI commands reference |
| [HMVC](skills/hmvc.md) | HMVC module system |
| [OpenAPI](skills/openapi.md) | OpenAPI documentation |
| [Realtime](skills/realtime.md) | WebSocket & SSE |
