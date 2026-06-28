# HMVC Module System

Hierarchical MVC (HMVC) lets you organize your application into **self-contained modules**, each with its own routes, views, and logic.

## Directory Structure

```
modules/
  blog/
    routes/
      posts.ts          ← /blog/posts
      comments.ts       ← /blog/posts/:id/comments
    views/
      posts.html
      post.html
      _layout.html      ← module-level layout (optional)
  shop/
    routes/
      products.ts       ← /shop/products
    views/
      products.html
      product.html
  admin/
    routes/
      dashboard.ts      ← /admin/dashboard
    views/
      dashboard.html
```

Each module is mounted at `/<module_name>` automatically.

## Creating a Module

### 1. Controller (`routes/posts.ts`)

```ts
import { Controller } from '@nexusts/core'

export class Posts extends Controller {
  async index() {
    const posts = await this.db.get('posts', null, { orderBy: 'created_at DESC' })
    return this.view('posts', { title: 'Blog', posts })
  }
}
```

### 2. View (`views/posts.html`)

```html
<h1>Blog</h1>
<? for (const p of posts) { ?>
  <div class="post">
    <h2><a href="/blog/posts/<?= p.id ?>"><?= p.title ?></a></h2>
  </div>
<? } ?>
```

### 3. View paths

Views are resolved relative to the module's `views/` directory:
- `this.view('posts')` → `modules/blog/views/posts.html`
- `this.view('post')` → `modules/blog/views/post.html`

If not found in the module, falls back to the root `views/` directory.

## Cross-Module Calls

Call another module's controller programmatically with `moduleRun()`:

```ts
import { moduleRun } from '@nexusts/core/helpers/modules'

export class Dashboard extends Controller {
  async index() {
    // Call blog module's Posts.index()
    const posts = await moduleRun('blog/posts/index', this.ctx)

    // Call shop module's Products.index()
    const products = await moduleRun('shop/products/index', this.ctx)

    return this.view('dashboard', {
      postCount: posts?.length ?? 0,
      productCount: products?.length ?? 0,
    })
  }
}
```

Syntax: `moduleRun('<module>/<controller>/<method>', ctx)`

- `moduleRun('blog/posts')` — calls `blog/posts/index`
- `moduleRun('shop/products/show', ctx)` — calls `shop/products/show` with context
- The context passes `db`, `session`, `auth`, etc.

## Module Sharing

Modules share the application's DI services:
- `this.db` — default database
- `this.dbs.*` — named databases
- `this.session` — session
- `this.auth` — authentication
- `this.cache`, `this.queue`, `this.upload`, `this.mail`

## Module Configuration (Optional)

Each module can have its own config file:

```ts
// modules/blog/config/app.ts
export default {
  prefix: '/blog',
  middleware: ['auth'],
}
```

If present, the module config is merged with the app config at registration time.

## When to Use HMVC

| Use Case | Recommended |
|----------|------------|
| Small app (< 10 routes) | Single `routes/` directory |
| Medium app (10-30 routes) | Organize by feature in `routes/` subdirs |
| Large app (30+ routes) | **HMVC modules** — each module independent |
| Team of 3+ developers | **HMVC modules** — each team owns a module |

## Benefits

- **Encapsulation** — each module is self-contained (routes + views + logic)
- **Reusability** — modules can be copied between projects
- **Testability** — each module can be tested independently
- **Team scalability** — teams work on separate modules without conflicts
- **Lazy loading** — modules only register when the `modules/` directory exists
