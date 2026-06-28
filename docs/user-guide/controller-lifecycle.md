# Controller Lifecycle Hooks

Bunigniter provides lifecycle hooks in the `Controller` base class that run automatically before controller methods.

## `_before()`

The `_before()` hook runs **before every controller method**. If it returns a `Response`, the response is sent immediately and the controller method is **not called**.

### Usage: Auth Guard

```ts
import { Controller } from 'bunigniter'

export class Admin extends Controller {
  protected _before(): Response | undefined {
    const user = this.auth.user()
    if (!user) return this.redirect('/login')
    // Return undefined → continue to the actual method
  }

  async index() {
    // This method is automatically protected
    const posts = await this.db.query('SELECT * FROM posts')
    return this.view('admin', { posts })
  }

  async show(id: number) {
    // This method is also protected — no duplicated auth check
    return this.view('edit', { post: await this.db.first('SELECT * FROM posts WHERE id = ?', [id]) })
  }
}
```

### How it works

```
Request → file-router → wrappedHandler
                           │
                           ├─ controller._before()
                           │     │
                           │     ├─ returns Response → send it (short-circuit)
                           │     │
                           │     └─ returns undefined → continue
                           │
                           └─ controller.method()
                                 └─ normal execution
```

### Common Use Cases

| Use Case | `_before()` Implementation |
|----------|---------------------------|
| **Auth required** | `if (!this.auth.check()) return this.redirect('/login')` |
| **Role check** | `if (this.auth.user()?.role !== 'admin') return this.notFound()` |
| **Feature flag** | `if (!featureEnabled) return this.view('coming-soon')` |
| **Request logging** | `console.log(this.ctx.request.method, this.ctx.request.url)` |
| **Rate limiting** | `if (isRateLimited) return this.json({ error: 'Too fast' }, 429)` |

### Multiple Guards

For multiple conditions, chain them:

```ts
protected _before(): Response | undefined {
  if (!this.auth.check()) return this.redirect('/login')
  if (this.auth.user()?.role !== 'admin') return this.notFound()
  if (this.ctx.query?.maintenance === 'true') return this.view('maintenance')
}
```

### Notes

- `_before()` is NOT async. For async operations, use middleware.
- `_before()` only runs for `extends Controller` classes, not for `defineHandler` routes.
- The hook is optional — controllers without `_before()` work normally.
- This is a simple, PHP-style pattern. For complex middleware needs, use the `middleware/` directory instead.
