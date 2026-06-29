# Middleware Guide

Middleware runs **before every request** and **after every response**. Use it for cross-cutting concerns that should apply to multiple routes without duplicating code in each controller.

---

## Creating Middleware

Place middleware files in the `middleware/` directory at your project root. Files are executed in **filename order** (prefix with numbers for ordering):

```
middleware/
├── 01_cors.ts        ← runs first
├── 02_csrf.ts        ← runs second
├── 03_auth.ts        ← runs third
└── 99_logger.ts      ← runs last
```

### Basic Structure

```ts
// middleware/01_auth.ts
import { defineMiddleware } from 'bunigniter'

export default defineMiddleware(async (c, next) => {
  // ═══ Before handler ═══
  const token = c.request.headers.get('authorization')
  if (!token) return new Response('Unauthorized', { status: 401 })

  // ═══ Pass to next handler ═══
  await next()

  // ═══ After handler ═══ (optional)
  console.log(`[auth] ${c.request.method} ${c.request.url}`)
})
```

### What middleware receives

| Parameter | Description |
|-----------|-------------|
| `c` | Elysia context — `c.request`, `c.headers`, `c.body`, `c.params`, `c.query` |
| `next` | Async function — call to pass control to the next middleware or controller |

### If middleware returns a Response

```ts
// early return — controller is NOT executed
export default defineMiddleware(async (c, next) => {
  if (c.request.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }
  await next()
})
```

---

## Common Middleware Examples

### Authentication

```ts
// middleware/01_auth.ts
export default defineMiddleware(async (c, next) => {
  const session = c.headers.get('cookie') || ''
  if (!session.includes('session=')) {
    return new Response('Unauthorized', { status: 401 })
  }
  await next()
})
```

### CORS

```ts
// middleware/01_cors.ts
export default defineMiddleware(async (c, next) => {
  if (c.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }
  await next()
})
```

### Request Logger

```ts
// middleware/99_logger.ts
export default defineMiddleware(async (c, next) => {
  const start = performance.now()
  await next()
  const ms = (performance.now() - start).toFixed(2)
  console.log(`${c.request.method} ${c.request.url} — ${ms}ms`)
})
```

### Rate Limiter

```ts
// middleware/02_throttle.ts
const requests = new Map<string, { count: number; reset: number }>()

export default defineMiddleware(async (c, next) => {
  const ip = c.request.headers.get('x-forwarded-for') || 'unknown'
  const now = Date.now()
  const entry = requests.get(ip) || { count: 0, reset: now + 60000 }

  if (now > entry.reset) {
    entry.count = 0
    entry.reset = now + 60000
  }

  entry.count++
  requests.set(ip, entry)

  if (entry.count > 100) {
    return new Response('Too Many Requests', { status: 429 })
  }

  await next()
})
```

### Feature Flag

```ts
// middleware/03_feature.ts
export default defineMiddleware(async (c, next) => {
  const url = new URL(c.request.url)
  if (url.pathname.startsWith('/beta') && !c.headers.get('x-beta-access')) {
    return new Response('Beta feature — access denied', { status: 403 })
  }
  await next()
})
```

---

## Built-in Middleware

Bunigniter bundles these middleware (configured in `config/app.ts`):

| Middleware | Config Key | Description |
|-----------|------------|-------------|
| CORS | `middleware.cors` | Cross-Origin Resource Sharing |
| CSRF | `middleware.csrf` | CSRF token validation on POST/PUT/DELETE |
| Logger | `middleware.logger` | Request logging + SQL query logging |
| Rate Limiter | `middleware.throttle` | Per-IP rate limiting |
| Session | Applied automatically | Cookie-based session encryption |
| Auth | Applied automatically | `this.auth.user()` in controllers |

```ts
// config/app.ts
export default {
  middleware: {
    cors: { origin: '*', credentials: true },
    csrf: { secret: env('APP_KEY', '') },
    logger: { enabled: true, showQuery: true },
    throttle: { max: 100, window: 60000 },
  },
}
```

To disable a built-in middleware, set it to `false`:

```ts
// config/app.ts
export default {
  middleware: {
    cors: false,   // ← disable CORS
    logger: false, // ← disable logging
  },
}
```

---

## Middleware vs `_before()` Hook

| Feature | Middleware (`middleware/`) | `_before()` Hook |
|---------|---------------------------|------------------|
| Scope | Global — all routes | Per-controller |
| Async | ✅ `async` | ❌ synchronous |
| Returns | `Response` or `next()` | `Response` or `undefined` |
| Access to controller | No (only Elysia context) | ✅ `this.db`, `this.auth`, etc. |
| Use case | CORS, logging, auth tokens | Auth guard, feature flags, setup |

**Rule of thumb:**

- Cross-cutting concern (applies to many routes) → **Middleware**
- Controller-specific setup (needs `this.db`, `this.auth`) → **`_before()`**

---

## See Also

- [Controller Lifecycle](controller-lifecycle.md) — `_before()` hook
- [Architecture](../analysis/architecture.md) — Helpers vs Services vs Middleware
- [Example Apps](../examples) — Working middleware examples
