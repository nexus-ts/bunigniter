# Helpers Reference
> **Helpers** (`bunigniter/helpers/*`) are stateless function collections — pure utilities like `env()`, `jwt.sign()`, `corsMiddleware()`.
> Import only what you need — unused helpers are tree-shaken by Bun's bundler.
## Environment
```ts
import { env, envOrFail } from 'bunigniter/helpers/env'
```
| Function | Description |
|----------|-------------|
| `env(key, default?)` | Read env var with type casting (boolean/number/string) |
| `envOrFail(key)` | Read required env var, throws if missing |
```ts
const port = env('PORT', 3000)         // → number
const debug = env('DEBUG', false)       // → boolean
const dbUrl = envOrFail('DATABASE_URL') // → string or throws
```
`.env` files are loaded automatically with priority: `.env.local` > `.env` > `process.env`.
---
## Validation
```ts
import { validate, validateStringRules, validateZod } from 'bunigniter/helpers/validator'
```
### String Rules (CodeIgniter-style)
```ts
const v = validate(this.body, {
  name: 'required|min:2|max:100',
  email: 'required|email',
  age: 'numeric|min:18',
})
if (v.fails()) return this.badRequest(v.errors)
```
| Rule | Description |
|------|-------------|
| `required` | Must not be empty |
| `min:N` | Minimum length/value |
| `max:N` | Maximum length/value |
| `email` | Valid email format |
| `numeric` | Must be a number |
| `integer` | Must be an integer |
| `boolean` | Must be boolean |
| `url` | Valid URL format |
| `alpha` | Letters only |
| `alpha_num` | Letters and numbers |
| `alpha_dash` | Letters, numbers, dashes, underscores |
| `same:field` | Must match another field |
| `differs:field` | Must differ from another field |
| `regex:pattern` | Custom regex pattern |
| `date` | Valid date string |
| `after:date` | Must be after a date |
| `before:date` | Must be before a date |
| `size:N` | Exact size/length |
### Zod Schema
```ts
import { z } from 'zod'
const v = validate(this.body, z.object({
  name: z.string().min(2),
  email: z.string().email(),
}))
```
### Controller Integration
```ts
class Users extends Controller {
  async create() {
    const v = this.validate(this.body, { name: 'required' })
    if (v.fails()) return this.badRequest(v.errors)
    // v.data — validated data
    // v.errors — { field: [messages] }
    // v.first('name') — first error for field
  }
}
```
---
## HTTP Client
```ts
import { HttpClient, createHttp } from 'bunigniter/helpers/http'
```
```ts
const http = new HttpClient()
const res = await http.get('https://api.github.com/repos/elysiajs/elysia')
console.log(res.data.stargazers_count, res.status)
const res2 = await http.post('https://api.example.com/data', { key: 'value' }, {
  headers: { 'Authorization': 'Bearer token' },
  timeout: 5000,
})
```
| Method | Description |
|--------|-------------|
| `http.get(url, options?)` | GET request |
| `http.post(url, body?, options?)` | POST request |
| `http.put(url, body?, options?)` | PUT request |
| `http.patch(url, body?, options?)` | PATCH request |
| `http.delete(url, options?)` | DELETE request |
Options: `query`, `headers`, `timeout`, `baseURL`, `auth` (Basic or Bearer).
---
## Pagination
```ts
import { paginate } from 'bunigniter/helpers/pagination'
```
```ts
const result = paginate(data, total, { page: 1, perPage: 20 })
// → { data, total, page, perPage, pages, firstPage, lastPage,
//     prevPage, nextPage, count, links }
```
| Field | Description |
|-------|-------------|
| `data` | Current page items |
| `total` | Total items across all pages |
| `page` | Current page (1-indexed) |
| `perPage` | Items per page |
| `pages` | Total number of pages |
| `prevPage` / `nextPage` | Previous/next page number |
| `firstPage` / `lastPage` | Is first/last page? |
| `links` | Simple HTML pagination links |
### Database Integration
```ts
const result = await db.paginate('SELECT * FROM users', [], { page: 2, perPage: 20 })
```
---
## CORS
```ts
import { corsMiddleware } from 'bunigniter/helpers/cors'
```
```ts
app.use(corsMiddleware({
  origin: ['https://myapp.com', 'http://localhost:5173'],
  methods: 'GET,POST,PUT,DELETE',
  credentials: true,
}))
```
| Option | Default | Description |
|--------|---------|-------------|
| `origin` | `'*'` | Allowed origins |
| `methods` | `GET,POST,PUT,PATCH,DELETE,OPTIONS` | Allowed methods |
| `allowedHeaders` | `Content-Type,Authorization,X-Inertia` | Allowed headers |
| `credentials` | `true` | Allow cookies |
| `maxAge` | `86400` | Preflight cache duration |
---
## Logger
```ts
import { loggerMiddleware } from 'bunigniter/helpers/logger'
```
```ts
app.use(loggerMiddleware({
  enabled: true,
  showQuery: true,
  skip: ['/health'],
}))
```
Output: `2026-06-28 14:30:00 GET /api/users 200 12ms`
---
## CSRF Protection
```ts
import { csrfMiddleware } from 'bunigniter/helpers/csrf'
```
```ts
app.use(csrfMiddleware({
  secret: env('APP_KEY'),
  protectedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
}))
```
---
## Rate Limiter
```ts
import { rateLimiter } from 'bunigniter/helpers/throttle'
```
```ts
app.use(rateLimiter({
  max: 100,        // requests
  window: 60000,   // per 60 seconds
  message: 'Too Many Requests',
  skip: ['/health'],
}))
```
Sets headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
---
## Debug Toolbar
```ts
import { debugToolbar, debugQuery, getStore } from 'bunigniter/helpers/debug'
```
Enable with `?debug=1` or `DEBUG=true` env var. Shows collapsible toolbar with:
- Method, path, status, duration
- SQL queries with timing bars
- Session data
- Request headers
```ts
// Automatically logs SQL queries from DbClient
// Or manually:
debugQuery(ctx, 'SELECT * FROM users', 2.5, 10)
```
---
## Moduler (HMVC)
```ts
import { registerModules, moduleRun } from 'bunigniter/helpers/modules'
```
See [HMVC Modules](hmvc-modules.md) for full documentation.
---
## OpenAPI
```ts
import { openapi, OpenAPIRegistry } from 'bunigniter/helpers/openapi'
```
See [OpenAPI](openapi.md) for full documentation.
---
## JWT
```ts
import { jwt, jwtMiddleware } from 'bunigniter/helpers/jwt'
```
See [JWT Auth](jwt-auth.md) for full documentation.
---
## SSE
```ts
import { sse } from 'bunigniter/helpers/sse'
```
See [SSE](sse.md) for full documentation.
---
## Schedule
```ts
import { schedule } from 'bunigniter/helpers/schedule'
```
See `routes/schedule.ts` for examples.
```ts
schedule.every(5000, 'task-name').do(async () => { ... })
schedule.stop('task-name')
schedule.stopAll()
schedule.list()
```
