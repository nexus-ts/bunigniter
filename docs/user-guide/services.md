# Services Reference
>
> **Services** (`bunigniter/services/*`) are stateful classes that manage resources — Cache, Queue, Mail, Upload, Image, WebSocket.
> They hold configuration, maintain connections, and must be initialized before use.
> Disable unused services in `config/app.ts` via `services: { cache: false }` to tree-shake from build.
>
## Cache

```ts
import { Cache, createCache } from 'bunigniter/services/cache'
```

```ts
const cache = new Cache({ defaultTtl: 60 })
cache.set('key', { data: 'value' }, 300)  // 5 min TTL
const val = cache.get('key')
cache.delete('key')
cache.clear()
cache.has('key')
// Get or set via callback
const data = await cache.remember('users', 300, async () => {
  return await db.query('SELECT * FROM users')
})
```

---

## Queue

```ts
import { Queue, createQueue } from 'bunigniter/services/queue'
```

```ts
const queue = new Queue({ maxConcurrency: 5 })
// Dispatch a job
const jobId = queue.dispatch('send_email', { to: 'user@test.com', template: 'welcome' })
// Process jobs
queue.process('send_email', async (job) => {
  await mail.send({ to: job.data.to, ... })
})
// Check status
const status = queue.status('send_email') // → { pending: 3, processing: 2 }
```

Features: retry with exponential backoff, max concurrency, error isolation
---

## Upload

```ts
import { Upload, createUpload } from 'bunigniter/services/upload'
```

```ts
const upload = new Upload({
  maxSize: 10 * 1024 * 1024,  // 10MB
  allowedMimes: ['image/jpeg', 'image/png'],
})
const file = upload.file(ctx.body, 'avatar')
if (!file) return this.badRequest({ avatar: 'File required' })
const ext = upload.extension(file)       // → '.jpg'
const path = upload.store(file, 'avatars') // → 'avatars/1712345678_abc123.jpg'
```

| Method | Description |
|--------|-------------|
| `upload.file(body, field)` | Get single uploaded file |
| `upload.files(body, field)` | Get multiple files |
| `upload.extension(file)` | Get file extension |
| `upload.store(file, subdir?)` | Save file to disk |

---

## Image Manipulation

```ts
import { Image } from 'bunigniter/services/image'
```

```ts
// Open, resize, save
await Image.open('photo.jpg')
  .resize(200, 200)
  .crop(100, 100)
  .rotate(90)
  .watermark('logo.png', 'bottom-right', 0.5)
  .save('thumb.jpg')
```

| Method | Description |
|--------|-------------|
| `Image.open(path)` | Open image file |
| `.resize(w, h?, mode?)` | Resize (fit/fill/cover) |
| `.crop(w, h, x?, y?)` | Crop |
| `.rotate(deg)` | Rotate (90/180/270) |
| `.flipH()` / `.flipV()` | Flip horizontally/vertically |
| `.watermark(path, position, opacity)` | Add watermark |
| `.save(path, format?)` | Save to file |

---

## Mail

```ts
import { Mail, createMail, SmtpTransport, FileTransport, NullTransport } from 'bunigniter/services/mail'
```

```ts
const mail = new Mail({
  defaultFrom: 'noreply@example.com',
  transport: new SmtpTransport({ host: 'smtp.example.com', port: 587, user: '...', pass: '...' }),
})
await mail.send({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Hello</h1>',
  text: 'Hello (plain text fallback)',
})
```

| Transport | Description |
|-----------|-------------|
| `NullTransport` | Discards all messages (testing) |
| `FileTransport` | Writes to JSON files (development) |
| `SmtpTransport` | Real SMTP delivery (production) |

---

## Session

```ts
import { Session } from 'bunigniter/services/session'
```

Session management with AES-256-GCM encryption. Data is stored in signed cookies.

```ts
const session = new Session({ key: 'your-32-byte-key-here' })
session.set('user_id', 123)
session.get('user_id')       // → 123
session.has('user_id')       // → true
session.delete('user_id')
session.clear()              // clear all
session.all()                // → { user_id: 123, ... }
```

In controllers, use `this.session` directly:

```ts
class Users extends Controller {
  async login() {
    this.session.set('user_id', user.id)
    this.session.set('role', user.role)
    return this.redirect('/dashboard')
  }

  async logout() {
    this.session.clear()
    return this.redirect('/')
  }
}
```

| Method | Description |
|--------|-------------|
| `session.get(key)` | Get a value |
| `session.set(key, value)` | Set a value |
| `session.has(key)` | Check existence |
| `session.delete(key)` | Remove a key |
| `session.clear()` | Clear all data |
| `session.all()` | Get all data as object |
| `session.id` | Get session ID |

The session is automatically decrypted on request and encrypted on response via middleware.

---

## WebSocket

```ts
import { ws } from 'bunigniter/services/ws'
```

See [WebSocket](websocket.md) for full documentation
---
