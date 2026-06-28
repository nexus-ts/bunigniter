# Request — Input Handling

> Bunigniter provides a CodeIgniter-style request proxy via `this.request` in Controllers.

The `RequestProxy` wraps Elysia's Context to provide a familiar input API inspired by CodeIgniter 3/4, Laravel, and AdonisJS.

---

## Basic Usage

```ts
export class Users extends Controller {
  async create() {
    // Read input (POST + GET merged, POST priority)
    const name = this.request.input('name', 'guest')
    const email = this.request.input('email')

    // Read only from POST body
    const password = this.request.post('password')

    // Read only from GET query
    const page = this.request.get('page', 1)

    // Mass-assignment protection
    const safe = this.request.only(['name', 'email'])

    // Check existence
    if (!this.request.has('name')) {
      return this.badRequest({ name: ['Required'] })
    }

    // Check non-empty value
    if (this.request.filled('email')) {
      // email was provided and is not empty
    }
  }
}
```

---

## API Reference

### Phase 1 — MVP

#### `input(key?, default?)`

Retrieve an input item from the request (POST + GET merged).  
POST takes priority over GET. Supports dot-notation for nested keys.

```ts
this.request.input('name')           // 'Alice' from body or query
this.request.input('name', 'guest')  // 'guest' if missing
this.request.input('user.email')     // dot-notation: body.user.email
this.request.input()                 // { name: '...', page: '1' } merged object
```

#### `get(key?, default?)`

Retrieve a query string item (GET only).

```ts
this.request.get('page')         // '1'
this.request.get('page', 1)      // 1 if missing
this.request.get()               // { page: '1', limit: '10' }
```

#### `post(key?, default?)`

Retrieve a POST / body item.

```ts
this.request.post('name')        // 'Alice' from body
this.request.post('name', '')    // '' if missing
this.request.post()              // { name: '...', email: '...' }
```

#### `only(keys)`

Retrieve only the specified keys (mass-assignment protection).

```ts
this.request.only(['name', 'email'])
// → { name: 'Alice', email: 'alice@test.com' }
// password and other fields are excluded
```

#### `has(key)`

Determine if the request contains a given key (body or query).

```ts
if (this.request.has('email')) { ... }
```

#### `filled(key)`

Determine if the request contains a non-empty value for a given key.

```ts
if (this.request.filled('name')) { ... }
// false for: undefined, null, '', missing key
```

#### `method()`

Get the HTTP method of the request (uppercase).

```ts
if (this.request.method() === 'POST') { ... }
// 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
```

#### `isAjax()`

Determine if the request is an AJAX request.  
Checks the `X-Requested-With` header.

```ts
if (this.request.isAjax()) {
  return this.json({ data })
}
```

#### `ip()`

Get the client IP address. Uses Bun's `server.requestIP()` when available.

```ts
const clientIp = this.request.ip()
// '::1', '192.168.1.1', or undefined
```

---

### Phase 2 — Productivity

#### `boolean(key, default?)`

Retrieve input as a boolean value.

```ts
this.request.boolean('active')         // true for: 'true', '1', 'yes', 'on', true
this.request.boolean('subscribe', true) // default: true when missing
```

Truthy values: `'true'`, `'1'`, `'yes'`, `'on'`, actual `true`.  
Everything else (including `'false'`, `'0'`) returns `false`.

#### `integer(key, default?)`

Retrieve input as an integer value.

```ts
this.request.integer('age')        // 25 (from '25' or 25)
this.request.integer('page', 1)    // 1 when missing
this.request.integer('count')      // 0 when missing (default)
```

Floats are floored: `25.7` → `25`.

#### `json(key?)`

Retrieve the JSON body (or a specific key via dot-notation).

```ts
this.request.json()                  // { user: { name: 'Alice' } }
this.request.json('user.name')       // 'Alice'
this.request.json('user.profile.age') // 30
```

#### `bearerToken()`

Extract the Bearer token from the `Authorization` header.

```ts
const token = this.request.bearerToken()
// 'eyJhbGci...' or null
```

#### `userAgent()`

Get the User-Agent string.

```ts
const ua = this.request.userAgent()
// 'Mozilla/5.0 ...' or ''
```

#### `cookie(key, default?)`

Retrieve a cookie value.

```ts
const theme = this.request.cookie('theme', 'light')
const sessionId = this.request.cookie('session_id')
```

#### `server(key)`

Retrieve a server / environment variable. Emulates PHP's `$_SERVER`.

```ts
this.request.server('REMOTE_ADDR')     // client IP
this.request.server('REQUEST_METHOD')  // 'POST'
this.request.server('HTTP_USER_AGENT') // User-Agent
this.request.server('SERVER_NAME')     // hostname
this.request.server('QUERY_STRING')    // 'page=1&limit=10'
this.request.server('HTTP_X_CUSTOM')   // custom header value
```

Supported keys: `REMOTE_ADDR`, `REQUEST_METHOD`, `HTTP_USER_AGENT`,  
`SERVER_NAME`, `SERVER_PORT`, `REQUEST_URI`, `QUERY_STRING`,  
and any `HTTP_*` key mapped to request headers.

---

## Elysia Raw Escape Hatch

The raw Elysia Context is always available for advanced use:

```ts
this.ctx_raw                          // full Elysia Context
this.ctx_raw.cookie.name.value = 'v'  // set cookie (mutable signal)
this.ctx_raw.server                   // Bun server instance
this.ctx_raw.request                  // Web Standard Request
```

---

## Compared to CodeIgniter

| Bunigniter | CodeIgniter 3/4 | Description |
|---------|----------------|-------------|
| `this.request.input('name')` | `$this->input->post('name')` | POST + GET merged |
| `this.request.get('page')` | `$this->input->get('page')` | GET only |
| `this.request.post('name')` | `$this->input->post('name')` | POST only |
| `this.request.only(['a','b'])` | — | Mass-assignment guard |
| `this.request.has('name')` | `isset($_POST['name'])` | Key existence |
| `this.request.filled('name')` | — | Non-empty check |
| `this.request.method()` | `$this->input->method()` | HTTP method |
| `this.request.isAjax()` | `$this->input->is_ajax_request()` | AJAX detection |
| `this.request.ip()` | `$this->input->ip_address()` | Client IP |
| `this.request.boolean('x')` | — | Boolean casting |
| `this.request.integer('x')` | — | Integer casting |
| `this.request.bearerToken()` | — | Bearer token |
| `this.request.userAgent()` | `$this->input->user_agent()` | User-Agent |
| `this.request.server('key')` | `$this->input->server('key')` | Server variable |
| `this.request.cookie('key')` | `$this->input->cookie('key')` | Cookie value |

---

## Source

- Implementation: `src/helpers/request.ts`
- Controller integration: `src/base/controller.ts`
- Exported from: `bunigniter` (`RequestProxy`)
