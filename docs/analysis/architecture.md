# Architecture — Helpers, Libraries, Middleware

Bunigniter organizes reusable code into three distinct layers inspired by CodeIgniter 3's separation of concerns. Each layer has a clear responsibility, lifecycle, and API style.

---

## Layer Overview

```
request → Middleware → Controller → Libraries / Helpers → response
                          │
                          ├─ this.load.helper('name')   → stateless functions
                          ├─ this.load.library('name')  → stateful service class
                          └─ middleware/ route guard     → HTTP pipeline hook
```

| Layer | Directory | Export Style | State | Initialization |
|-------|-----------|-------------|-------|---------------|
| **Helper** | `helpers/` | `export function` | Stateless | None — call directly |
| **Library** | `libraries/` | `export class` | Stateful | `new Class(opts)` |
| **Middleware** | `middleware/` | `export default defineMiddleware(...)` | Stateless | Auto-applied by router |
| **Service** | `src/helpers/*` | Mixed (framework internal) | Mixed | Wired at app boot |

---

## 1. Helpers — Stateless Function Collections

**Location:** `helpers/` (project-level) or `bunigniter/helpers/*` (framework-provided)

Helpers are **collections of pure functions**. They perform a single task, hold no state, and need no initialization.

### Rules

- Only `export function` — no classes, no constructors
- No internal state — same input always produces the same output
- No side effects — no filesystem, network, or database access
- Loaded on demand — only included in the bundle when imported

### Framework-provided helpers

```ts
import { env } from 'bunigniter/helpers/env'
import { jwt } from 'bunigniter/helpers/jwt'
import { corsMiddleware } from 'bunigniter/helpers/cors'
import { csrfMiddleware } from 'bunigniter/helpers/csrf'
import { rateLimiter } from 'bunigniter/helpers/throttle'
import { paginate } from 'bunigniter/helpers/pagination'
import { defineHandler } from 'bunigniter/helpers/handler'
import { RequestProxy } from 'bunigniter/helpers/request'
// ... see full list in bunigniter/package.json exports
```

### User-defined helpers

```ts
// helpers/format_date.ts
export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

export function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  return `${Math.floor(diff / 60000)}m ago`
}
```

```ts
// Controller
const { formatDate } = await this.load.helper('format_date')
```

### When to create a Helper

- You need a **pure function** — same input, same output
- No configuration, no connection, no state
- Examples: string formatting, date manipulation, math, validation rules

---

## 2. Libraries — Stateful Service Classes

**Location:** `libraries/` (project-level) or `bunigniter/libraries/*` (framework-provided)

Libraries are **classes that manage state and resources**. They hold configuration, maintain connections, and provide a stateful API. A library must be **initialized** before use.

### Rules

- `export class` with a constructor
- Holds internal state (config, connection, cache store, etc.)
- Must be instantiated before use — `new Library(options)`
- May have side effects (network, filesystem, database)

### Framework-provided libraries

```ts
import { Cache, createCache } from 'bunigniter/libraries/cache'
import { Queue, createQueue } from 'bunigniter/libraries/queue'
import { Mail, createMail } from 'bunigniter/libraries/mail'
import { Upload, createUpload } from 'bunigniter/libraries/upload'
import { Image } from 'bunigniter/libraries/image'
import { Session } from 'bunigniter/libraries/session'
import { ws } from 'bunigniter/libraries/ws'
```

### User-defined libraries

```ts
// libraries/payment.ts
export class PaymentGateway {
  private apiKey: string

  constructor(options: { apiKey: string }) {
    this.apiKey = options.apiKey          // ← initialization
  }

  async charge(amount: number, token: string) {
    const res = await fetch('https://api.stripe.com/v1/charges', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ amount, token }),
    })
    return res.json()
  }
}
```

```ts
// Controller
const payment = await this.load.library('payment', { apiKey: 'sk_xxx' })
const result = await payment.charge(100, 'tok_xxx')
```

### When to create a Library

- You need **state** — configuration, connection pool, cached data
- You need **initialization** — constructor arguments, async setup
- You manage **external resources** — APIs, databases, file systems
- Examples: payment gateway, email service, file storage, AI client

---

## 3. Middleware — HTTP Pipeline Hooks

**Location:** `middleware/` (project-level, filename prefixed with `01_`, `02_`)

Middleware intercepts every HTTP request **before** it reaches the controller and **after** the response is generated. Middleware handles **cross-cutting concerns** — concerns that apply to many routes.

### Rules

- `export default defineMiddleware(async (c, next) => { ... })`
- Always calls `await next()` to pass to the next handler
- Ordered by filename prefix (`01_auth.ts` runs before `02_logger.ts`)
- Stateless — no constructor, no configuration (use config file instead)
- Runs on **every request** matching the route

### Example

```ts
// middleware/01_auth.ts
import { defineMiddleware } from 'bunigniter'

export default defineMiddleware(async (c, next) => {
  const token = c.request.headers.get('authorization')
  if (!token) return new Response('Unauthorized', { status: 401 })
  await next()
})
```

### When to create Middleware

- Logic must run **before/after every request**
- Cross-cutting concern: auth, logging, CORS, CSRF, rate limiting
- You don't want individual controllers to handle this

---

## 4. Decision Flow

```
I need to write some code. Where does it go?
│
├─ Does it run before/after every HTTP request?
│  └─ Yes → middleware/
│
├─ Does it hold state (config, connection, cache)?
│  ├─ Yes → library/ (export class, constructor, new)
│  └─ No → helper/ (export function, pure)
│
├─ Is it a reusable utility function with no dependencies?
│  └─ Yes → helper/
│
└─ Is it an external service (payment, email, storage)?
   └─ Yes → library/
```

### Concrete examples

| Task | Type | Reason |
|------|------|--------|
| Validate CSRF token on POST | **Middleware** | Every POST request needs it |
| Format a date string | **Helper** | Pure function, no state |
| Charge a credit card | **Library** | Holds API key, makes network calls |
| Log request duration | **Middleware** | Every request, cross-cutting |
| Paginate a query result | **Helper** | Pure calculation |
| Send an email | **Library** | Needs SMTP config, connection |
| Check authentication | **Middleware** | Before every protected route |
| Generate a JWT | **Helper** | Pure crypto operation |
| Manage file uploads | **Library** | Holds config, manages files |

---

## 5. Framework Boot Sequence

```
import "bunigniter"
       │
       ▼
  config/app.ts  ← load env, read config
       │
       ▼
  Elysia app instance
       │
       ├─ Middleware applied: CORS, Logger, CSRF, Rate Limit
       ├─ Session + Auth middleware
       ├─ View engine configured
       ├─ Database connected (DbClient)
       ├─ Services initialized: Cache, Queue, Upload, Mail
       ├─ File routes registered
       ├─ HMVC modules registered
       ├─ WebSocket mounted
       ├─ OpenAPI docs generated
       └─ Server listens on :PORT
```

Services (Cache, Queue, Upload, Mail) are instantiated at boot and injected into the router. Controllers access them via `this.cache`, `this.queue`, `this.upload`, `this.mail`. User-defined libraries are loaded on demand via `this.load.library()`.

---

## 6. Package Export Map

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./helpers/*": "./src/helpers/*",     // stateless function collections
    "./libraries/*": "./src/libraries/*", // stateful service classes
    "./edge": "./src/edge.ts"
  }
}
```

Users import only what they need:

```ts
import "bunigniter"                          // framework boot (always)
import { env } from 'bunigniter/helpers/env'  // helper (stateless)
import { ws } from 'bunigniter/libraries/ws'  // library (stateful)
```

Unused imports are tree-shaken by Bun's bundler — only the code you actually use ends up in the production build.

---

## See Also

- [Controller Guide](../user-guide/controller-lifecycle.md) — Request lifecycle
- [Middleware Guide](../user-guide/middleware.md) — Creating middleware
- [Helpers Reference](../user-guide/helpers.md) — Built-in helpers
- [Load Service](../user-guide/load.md) — Loading user helpers/libraries
