# Auth & Security

## Session Auth

```ts
this.auth.user()            // → { id, username, role } | null
this.auth.login(user)       // → save to session
this.auth.logout()          // → clear session
this.auth.check()           // → boolean

// Guard all methods
protected _before() {
  if (!this.auth.check()) return this.redirect('/login')
}
```

## JWT Auth

```ts
import { jwt } from 'bunigniter/helpers/jwt'

const token = jwt.sign({ userId: 1, role: 'admin' }, { secret: 'key', expiresIn: 3600 })
const payload = jwt.verify(token, { secret: 'key' })
const token = jwt.fromHeader(authHeader)  // Extract Bearer token
```

## Validator

```ts
const v = this.validate(this.body, { name: 'required|min:2|email' })
v.passes / v.fails() / v.errors / v.first('name') / v.get('name')
```

## Middleware

Place in `middleware/` directory:
```
middleware/01_timing.ts   ← runs first
middleware/02_auth.ts     ← runs second
```
