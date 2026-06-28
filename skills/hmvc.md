# HMVC Modules

## Structure

```
modules/<name>/
  routes/<file>.ts    ← /<name>/<file>/...
  views/<file>.html   ← Module-specific views
```

## Registration

Automatically mounted at boot. Module name becomes URL prefix.

```
modules/blog/routes/posts.ts   → /blog/posts
modules/shop/routes/products.ts → /shop/products
```

## Cross-Module Calls

```ts
import { moduleRun } from 'bunigniter/helpers/modules'

const posts = await moduleRun('blog/posts/index', ctx)
```

Each module gets its own `routes/` and `views/` but shares the app's DI services (db, session, auth, etc.).
