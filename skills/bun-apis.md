# Bun Built-in APIs

> Bun implements native APIs on the `Bun` global object and built-in modules.
> These are available in Bun runtime but NOT in Vitest/Node test environments.

---

## Authentication & Security

### Bun.CSRF — CSRF Token Protection

```ts
// Generate a token (bound to session if sessionId provided)
const token = Bun.CSRF.generate('my-secret', {
  sessionId: 'user-session-id',
  expiresIn: 86400000,     // 24 hours (default)
  encoding: 'base64url',    // 'base64' | 'base64url' | 'hex'
  algorithm: 'sha256',      // 'sha256' | 'sha384' | 'sha512' | 'blake2b256' | 'blake2b512'
})

// Verify
const isValid = Bun.CSRF.verify(token, {
  secret: 'my-secret',
  sessionId: 'user-session-id',
  maxAge: 3600000,          // Enforce shorter age than generate's expiresIn
})
```

### Bun.password — Password Hashing

```ts
const hash = await Bun.password.hash('user-password', {
  algorithm: 'argon2id',    // 'argon2id' | 'argon2i' | 'argon2d' | 'bcrypt'
  memoryCost: 8,            // argon2 only
  timeCost: 3,              // argon2 only
  cost: 4,                  // bcrypt only (4-31)
})

const isMatch = await Bun.password.verify('user-password', hash)
```

---

## Hashing & HMAC

### Bun.CryptoHasher — HMAC + Hashing

```ts
// HMAC-SHA256
const sig = new Bun.CryptoHasher('sha256', 'secret-key')
  .update('data')
  .digest('hex')            // 'hex' | 'base64' | 'base64url' | Uint8Array

// Supported HMAC algorithms:
// 'blake2b512' | 'md5' | 'sha1' | 'sha224' | 'sha256'
// | 'sha384' | 'sha512-224' | 'sha512-256' | 'sha512'
```

### Bun.hash — Non-cryptographic Hashing

```ts
Bun.hash('data')                    // Wyhash 64-bit
Bun.hash.wyhash('data')             // Same as Bun.hash()
Bun.hash.crc32('data')
Bun.hash.adler32('data')
Bun.hash.xxHash3('data')
Bun.hash.murmur64v2('data')
Bun.hash.rapidhash('data')
```

---

## HTTP & Server

### Bun.serve — HTTP Server

```ts
Bun.serve({
  fetch(req: Request) { return new Response('Hello!') },
  port: 3000,
  tls?: { key: Bun.file('key.pem'), cert: Bun.file('cert.pem') },
  websocket?: { ... },     // WebSocket upgrade handler
  routes?: { ... },         // Static routes (Bun v1.2+)
  idleTimeout?: 10,         // TCP timeout in seconds
})
// Uses Bun internally (we wrap this via Elysia)
```

### Bun.serve — Server-Sent Events

```ts
const server = Bun.serve({
  fetch(req) { return new Response('...') },
  websocket: {
    open(ws) { ws.subscribe('channel') },
    message(ws, msg) { ws.publish('channel', msg) },
  },
})
```

---

## File I/O

### Bun.file — Read Files

```ts
const file = Bun.file('path/to/file')
const text = await file.text()
const json = await file.json()
const blob = await file.blob()
const bytes = await file.bytes()
const stream = file.stream()
file.size        // bytes
file.type        // MIME type
file.lastModified // Date
```

### Bun.write — Write Files

```ts
await Bun.write('output.txt', 'content')
await Bun.write('output.json', JSON.stringify(data))
await Bun.write(Bun.file('output'), response)
```

---

## Process & Shell

### Bun.$ — Shell Commands

```ts
const result = await Bun.$`echo hello`.text()
const { stdout, stderr, exitCode } = await Bun.$`ls -la`.quiet()
// Supports pipes: Bun.$`cat file | wc -l`
// Supports templates: Bun.$`echo ${variable}`
```

### Bun.spawn — Child Processes

```ts
const proc = Bun.spawn(['ls', '-la'], {
  cwd: '/tmp',
  env: { ...process.env, FOO: 'bar' },
  stdin: 'pipe',
  stdout: 'pipe',
})
const output = await new Response(proc.stdout).text()
```

### Bun.spawnSync — Blocking Child Process

```ts
const result = Bun.spawnSync(['git', 'status'])
console.log(result.stdout.toString())
```

---

## Routing & Transpilation

### Bun.FileSystemRouter

```ts
const router = new Bun.FileSystemRouter({
  style: 'nextjs',         // 'nextjs' | 'nuxt'
  dir: './routes',
  origin: 'http://localhost',
})

// Matches /users/123 → routes/users/[id].ts with params: { id: '123' }
```

### Bun.Transpiler

```ts
const transpiler = new Bun.Transpiler()
const result = await transpiler.transform('const x: number = 1')
const resultSync = transpiler.transformSync('file.ts')
```

---

## Streaming & HTML

### HTMLRewriter — Server-side DOM

```ts
const rewriter = new HTMLRewriter()
  .on('h1', {
    element(el) { el.setInnerContent('New Title') },
  })
  .transform(new Response('<h1>Old</h1>'))
```

---

## Testing

### bun:test — Built-in Test Runner

```ts
import { describe, it, expect, mock, spyOn, beforeAll, afterAll } from 'bun:test'
```

---

## Utilities

### Bun.sleep / Bun.sleepSync

```ts
await Bun.sleep(1000)      // sleep 1 second
Bun.sleepSync(100)         // blocking sleep 100ms
Bun.nanoseconds()          // high-res timestamp
```

### Bun.version / Bun.env / Bun.main

```ts
Bun.version                 // '1.3.14'
Bun.revision                // git commit hash
Bun.env                     // same as process.env but faster
Bun.main                    // entry point file path
```

### Bun.randomUUIDv7

```ts
const uuid = Bun.randomUUIDv7()   // time-ordered UUID v7
```

### Bun.peek — Synchronous Promise Inspection

```ts
const promise = fetch('https://example.com')
const result = Bun.peek(promise)  // Promise | value
```

### Stream Helpers

```ts
await Bun.readableStreamToBytes(stream)    // Uint8Array
await Bun.readableStreamToBlob(stream)     // Blob
await Bun.readableStreamToJSON(stream)     // parsed JSON
await Bun.readableStreamToFormData(stream) // FormData
await Bun.readableStreamToArray(stream)    // any[]
```

### Bun.gzipSync / Bun.gunzipSync

```ts
const compressed = Bun.gzipSync(data)
const decompressed = Bun.gunzipSync(compressed)
```

### Bun.escapeHTML

```ts
Bun.escapeHTML('<script>')   // '&lt;script&gt;'
```

---

## Database

### bun:sqlite

```ts
import { Database } from 'bun:sqlite'
const db = new Database('path/to.db')
db.run('CREATE TABLE ...')
const rows = db.query('SELECT * FROM users').all()
```

### Bun.SQL — PostgreSQL

```ts
const sql = Bun.SQL({ host: '...', port: 5432, ... })
await sql`SELECT * FROM users`
```

### Bun.RedisClient

```ts
const redis = Bun.redis({ host: '...', port: 6379 })
await redis.set('key', 'value')
const val = await redis.get('key')
```

---

## Important Note for Development

**Bun APIs are NOT available in Vitest (Node mode).**
When writing tests, use `node:crypto` or Web Crypto API instead of `Bun.CryptoHasher`.
Use `bun:sqlite` or `node:fs` instead of `Bun.file()`/`Bun.write()`.

However, in production code (runs on Bun), all `Bun.*` APIs are available.
