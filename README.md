# NexusTS

**Bun-native fullstack framework — CodeIgniter spirit × Elysia v2 performance × Edge-ready**

```bash
bun create nexusts my-app
cd my-app
bun run dev
```

---

## Why NexusTS?

PHP developers (CodeIgniter, Laravel) moving to TypeScript face a wall: NestJS is over-engineered, Hono is too bare, AdonisJS is Node-only. **NexusTS is the bridge.**

```ts
// pages/users.ts — file path = URL
export class Users extends Controller {
  async index() {
    const users = await this.db.query('SELECT * FROM users')
    return this.json(users)
  }
  async show(id: number) {
    const user = await this.db.first('SELECT * FROM users WHERE id = ?', [id])
    if (!user) return this.notFound()
    return this.json(user)
  }
  async create() {
    const v = this.validate(this.body, { name: 'required|min:2', email: 'required|email' })
    if (v.fails()) return this.badRequest(v.errors)
    const r = await this.db.query('INSERT INTO users (name, email) VALUES (?, ?)', [v.data.name, v.data.email])
    return this.json({ id: r.insertId }, 201)
  }
}
```

---

## Quick Start

```bash
# Install
bun create nexusts my-app
cd my-app
bun install

# Seed sample data
bun run db/seed

# Start dev server (hot reload)
bun run dev

# Test
curl http://localhost:3000/api/users
curl http://localhost:3000/api/users/1
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@test.com"}'
```

---

## Features

| Feature | API | Status |
|---------|-----|--------|
| **File-based Routing** | `pages/users.ts` → `/api/users` | ✅ |
| **Controller** | `extends Controller` → `this.db`, `this.json()`, `this.body` | ✅ |
| **Service** | `extends Service` → `this.db` | ✅ |
| **Raw SQL** | `this.db.query('SELECT * FROM users WHERE id = ?', [id])` | ✅ |
| **Drizzle ORM** | `this.db.select().from(users).all()` | ✅ |
| **ACID Transactions** | `this.db.transaction(async (tx) => { ... })` | ✅ |
| **Validation (string rules)** | `this.validate(body, { name: 'required|min:2' })` | ✅ |
| **Validation (Zod)** | `this.validate(body, z.object({ name: z.string().min(2) }))` | ✅ |
| **Env Config** | `env('PORT', 3000)`, `.env` file loading | ✅ |
| **CLI Scaffolding** | `bun run nx make:controller`, `make:model` | ✅ |
| **View Engine (SSR)** | `.server.ts` loader → HTML shell with `data-page` JSON | ✅ |
| **Session** | `this.session.get/set/delete/clear`, encrypted cookie | ✅ |
| **Auth** | `this.auth.user/login/logout/check` | ✅ |
| **CORS** | Configurable origins, methods, credentials | ✅ |
| **Logger** | Color-coded request logging with timing | ✅ |
| **CSRF** | Automatic token generation + validation | ✅ |
| **Rate Limiter** | In-memory, 100 req/min default, `X-RateLimit` headers | ✅ |
| **Cache** | `this.cache.get/set/delete/remember`, TTL support | ✅ |
| **Queue** | `this.queue.dispatch('name', data)`, retry with backoff | ✅ |
| **Upload** | `this.upload.file('field')`, size/MIME validation | ✅ |
| **Mail** | `this.mail.send({ to, subject, html })`, SMTP/File/Null | ✅ |
| **Multi-DB** | PostgreSQL, MySQL, SQLite, Bun SQLite, Cloudflare D1 | ✅ |
| **Edge (CF Workers)** | `bun run nx build:edge` → `wrangler deploy` | ✅ |
| **Edge (Deno)** | `import app from './edge-app'; Deno.serve(app.fetch)` | ✅ |
| **Testing** | 39 Vitest tests, smoke + unit | ✅ |

---

## Project Structure

```
my-app/
├── config/
│   └── app.ts              ← Single config file (port, db, middleware, etc.)
├── pages/
│   ├── index.ts             ← GET /api
│   ├── users.ts             ← CRUD /api/users
│   ├── auth.ts              ← Login/logout
│   └── dashboard.server.ts  ← Void-style loader (SSR)
├── db/
│   └── seed.ts              ← Database seeder
├── src/
│   ├── index.ts             ← Bun entry point
│   ├── edge.ts              ← Edge entry point
│   ├── edge-builder.ts      ← Pre-compile routes for edge
│   ├── base/
│   │   ├── controller.ts    ← Controller base class
│   │   ├── service.ts       ← Service base class
│   │   └── index.ts
│   ├── router/
│   │   └── file-router.ts   ← Auto file-path routing
│   ├── db/
│   │   └── drizzle.ts       ← Drizzle wrapper (5 dialects)
│   ├── helpers/
│   │   ├── env.ts           ← env() helper
│   │   ├── validator.ts     ← Validation (string rules + Zod)
│   │   ├── session.ts       ← Cookie session
│   │   ├── cache.ts         ← Key-value cache
│   │   ├── queue.ts         ← Job queue
│   │   ├── upload.ts        ← File upload
│   │   ├── mail.ts          ← Email (SMTP/File/Null)
│   │   ├── cors.ts          ← CORS middleware
│   │   ├── logger.ts        ← Request logger
│   │   ├── csrf.ts          ← CSRF protection
│   │   ├── throttle.ts      ← Rate limiter
│   │   └── middleware.ts    ← Middleware loader
│   └── cli/
│       └── index.ts         ← nx CLI
├── tests/
│   ├── smoke.test.ts        ← Integration tests (9)
│   ├── env.test.ts          ← Env unit tests (6)
│   ├── validator.test.ts    ← Validation tests (12)
│   └── session.test.ts      ← Session tests (12)
├── edge-app.ts              ← Generated edge routes
├── edge-worker.ts           ← CF Workers entry
├── wrangler.toml            ← CF Workers config
├── .env.example
├── vitest.config.ts
└── package.json
```

---

## CLI Reference

```bash
bun run nx                    # Show help
bun run nx list               # List all routes
bun run nx make:controller <name>   # Scaffold a controller
bun run nx make:model <name>        # Scaffold a DB schema
bun run nx build:edge         # Pre-compile routes for edge
bun run nx edge:dev           # Run edge app locally
```

---

## Deployment

### Bun (production)

```bash
bun run build
bun run start
```

### Cloudflare Workers

```bash
bun run nx build:edge
wrangler deploy
```

### Deno

```ts
import app from './edge-app'
Deno.serve(app.fetch)
```

---

## Configuration

```ts
// config/app.ts
export default {
  port: env('PORT', 3000),
  db: {
    dialect: env('DB_DIALECT', 'bun-sqlite'),
    connection: { filename: env('DB_FILENAME', 'app.db') },
  },
  middleware: {
    cors: { origin: '*', credentials: true },
    logger: { enabled: true },
    csrf: { secret: env('APP_KEY') },
    throttle: { max: 100, window: 60000 },
  },
}
```

---

## License

MIT — 2026 NexusTS Contributors
