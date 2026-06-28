# Controller — Creating Routes

## File Location

`routes/<name>.ts`

## Pattern

```ts
import { Controller } from 'bunigniter'

export class <Name> extends Controller {
  async index() { ... }     // GET  /<name>
  async show(id) { ... }    // GET  /<name>/:id
  async create() { ... }    // POST /<name>
  async update(id) { ... }  // PUT  /<name>/:id
  async destroy(id) { ... } // DELETE /<name>/:id
}
```

## Rules

- Only methods that exist are registered (no unused routes)
- Import from `bunigniter`, NOT relative paths
- `_before()` runs before every method (return Response to short-circuit)

## Input Handling

- `this.request.input(key, default?)` — POST + GET merged access
- `this.request.get(key, default?)` — query string only
- `this.request.post(key, default?)` — POST body only
- `this.request.only(keys)` — mass-assignment protection
- `this.request.has(key)` / `this.request.filled(key)` — existence checks
- `this.request.method()` — HTTP method
- `this.request.isAjax()` — AJAX detection
- `this.request.ip()` — client IP
- `this.request.boolean(key)` / `this.request.integer(key)` — type casting
- `this.request.bearerToken()` — Bearer token extraction
- `this.request.json(key?)` — JSON dot-notation access
- `this.request.cookie(key)` — cookie access
- `this.request.server(key)` — server variable access
- `this.request.userAgent()` — User-Agent string

## Responses

- `this.validate(body, rules)` — input validation
- `this.db.get/insert/update/delete` — queries
- `this.view(name, props)` — HTML templates
- `this.json(data)` — API responses
