# JWT Authentication

Bunigniter provides JWT (JSON Web Token) support for stateless API authentication.

## Quick Start

```ts
import { jwt } from 'bunigniter/helpers/jwt'

// Sign a token (payload + optional config)
const token = jwt.sign({ userId: 1, role: 'admin' })
// → eyJhbGciOiJIUzI1NiIs...

// Verify a token
const payload = jwt.verify(token)
// → { userId: 1, role: 'admin', iat: 1700000000, exp: 1700003600 }

// Extract Bearer token from Authorization header
const token = jwt.fromHeader(ctx.request.headers.get('authorization'))
```

## Configuration

```ts
jwt.sign(payload, {
  secret: 'my-secret-key',    // HMAC secret (default: APP_KEY)
  expiresIn: 7200,            // seconds (default: 3600 = 1 hour)
  issuer: 'my-app',          // optional "iss" claim
})
```

Best practice: set `JWT_SECRET` in your `.env` file:

```
JWT_SECRET=your-256-bit-secret-here
```

Then reference it:

```ts
const token = jwt.sign({ userId: 1 }, { secret: env('JWT_SECRET') })
```

## Login Endpoint

```ts
// routes/auth.ts
import { Controller } from 'bunigniter'
import { jwt } from 'bunigniter/helpers/jwt'

export class Auth extends Controller {
  async create() {
    const { username, password } = this.body
    const user = await this.db.first(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    )
    if (!user) return this.json({ error: 'Invalid credentials' }, 401)

    // Generate JWT token
    const token = jwt.sign({
      userId: user.id,
      role: user.role,
      username: user.username,
    })

    return this.json({ token, user: { id: user.id, username: user.username, role: user.role } })
  }
}
```

## Protecting Routes with Middleware

### Option 1: Elysia Middleware

```ts
// middleware/02_auth.ts
import { jwtMiddleware } from 'bunigniter/helpers/jwt'

export default jwtMiddleware({ secret: process.env.JWT_SECRET })
```

Apply to specific routes:

```ts
// routes/api/users.ts
import { defineHandler } from 'bunigniter'
import { jwtMiddleware } from 'bunigniter/helpers/jwt'

const requireAuth = jwtMiddleware()

export const GET = defineHandler(requireAuth, async (c) => {
  // c.jwt contains decoded payload
  return { user: c.jwt, message: 'Protected data' }
})
```

### Option 2: Controller `_before()` Hook

```ts
import { Controller } from 'bunigniter'
import { jwt } from 'bunigniter/helpers/jwt'

export class AdminController extends Controller {
  protected _before(): Response | undefined {
    const authHeader = this.ctx.request?.headers?.get('authorization')
    const token = jwt.fromHeader(authHeader)
    if (!token) return this.json({ error: 'Missing token' }, 401)

    try {
      const payload = jwt.verify(token)
      ;(this as any).currentUser = payload
    } catch {
      return this.json({ error: 'Invalid or expired token' }, 401)
    }
  }

  // All methods below are automatically protected
  async index() {
    const user = (this as any).currentUser
    return this.json({ message: `Hello ${user.role}` })
  }
}
```

### Option 3: Per-Method Check

```ts
class Posts extends Controller {
  async create() {
    const token = jwt.fromHeader(this.ctx.request?.headers?.get('authorization'))
    if (!token) return this.json({ error: 'Login required' }, 401)

    try {
      const user = jwt.verify(token)
      await this.db.insert('posts', { title: this.body.title, user_id: user.userId })
      return this.json({ ok: true }, 201)
    } catch {
      return this.json({ error: 'Invalid token' }, 401)
    }
  }
}
```

## JWT Payload

The payload automatically includes:

| Field | Description | Auto-added |
|-------|-------------|-----------|
| `(your data)` | Custom fields from sign() | — |
| `iat` | Issued at (Unix timestamp) | ✅ Always |
| `exp` | Expiration (Unix timestamp) | ✅ Always |
| `iss` | Issuer | ✅ If configured |

## Token Expiration

Default expiration is 1 hour (`3600` seconds). Configure per-token:

```ts
// Short-lived token (5 minutes)
const token = jwt.sign({ userId: 1 }, { expiresIn: 300 })

// Long-lived token (30 days)
const refreshToken = jwt.sign({ userId: 1, type: 'refresh' }, { expiresIn: 2592000 })
```

Expired tokens throw: `"JWT expired"` on `jwt.verify()`.

## Client Usage

```ts
// Login
const res = await fetch('/api/login', {
  method: 'POST',
  body: JSON.stringify({ username: 'admin', password: 'secret' }),
})
const { token } = await res.json()

// Subsequent requests
const data = await fetch('/api/protected', {
  headers: { 'Authorization': `Bearer ${token}` },
})
```

## API Reference

```ts
jwt.sign(payload, config?)
  → string (JWT token)

jwt.verify(token, config?)
  → JwtPayload (decoded payload)
  → throws on invalid signature, expired, or malformed

jwt.fromHeader(headerValue?)
  → string | null (extracted Bearer token)

jwtMiddleware(config?)
  → Elysia middleware handler (returns 401 on failure)
```

## Complete Example

```ts
// routes/auth.ts
import { Controller } from 'bunigniter'
import { jwt } from 'bunigniter/helpers/jwt'

export class Auth extends Controller {
  async create() {
    const { username, password } = this.body
    const user = await this.db.first(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    )
    if (!user) return this.json({ error: 'Invalid credentials' }, 401)
    const token = jwt.sign({ userId: user.id, role: user.role })
    return this.json({ token })
  }
}

// routes/api/users.ts
import { Controller } from 'bunigniter'
import { jwt } from 'bunigniter/helpers/jwt'

export class Users extends Controller {
  // This endpoint returns the token — no auth needed
  async index() {
    const users = await this.db.get('users')
    return this.json(users)
  }

  // This endpoint requires JWT (checked in _before)
  protected _before() {
    const auth = this.ctx.request?.headers?.get('authorization')
    const token = jwt.fromHeader(auth)
    if (!token) return this.json({ error: 'Unauthorized' }, 401)
    try {
      const payload = jwt.verify(token)
      ;(this as any).currentUser = payload
    } catch {
      return this.json({ error: 'Invalid token' }, 401)
    }
  }

  async create() {
    const user = (this as any).currentUser
    await this.db.insert('posts', { title: this.body.title, user_id: user.userId })
    return this.json({ ok: true }, 201)
  }
}
```
