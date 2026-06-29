# Inertia-style Pages

Bunigniter supports **Inertia-style** page rendering — a protocol where the first request returns a full HTML shell with embedded page data, and subsequent navigations return JSON only. This gives you **SPA-like navigation** with **server-side rendering** on first load.

> **Example app:** `bun run examples/blog-app-inertia-react/dev.ts`

---

## How It Works

```
First request (GET /users)
  → Server renders full HTML with <div id="app" data-page='{...}'>
  → Client-side JS reads data-page, hydrates the page

Subsequent navigation (click <Link>)
  → Client sends X-Inertia: true header
  → Server returns JSON: { component, props, url, version }
  → Client swaps the page without full reload
```

---

## Controller Usage

### `this.page(component, props, options)`

Return a page response with a component name and props:

```ts
// routes/users.ts
import { Controller } from 'bunigniter'

export class Users extends Controller {
  async index() {
    const users = await this.db.query('SELECT * FROM users')
    return this.page('Users/Index', { users }, {
      title: 'Users List',
    })
  }

  async show(id: number) {
    const user = await this.db.first('SELECT * FROM users WHERE id = ?', [id])
    if (!user) return this.notFound('User not found')
    return this.page('Users/Show', { user })
  }
}
```

### `this.share(key, value)` / `this.share({ key: value })`

Share props across all pages (like Inertia's `Inertia.share`):

```ts
// routes/users.ts
export class Users extends Controller {
  protected _before() {
    // Shared with every page response from this controller
    this.share('appName', 'My App')
    this.share({ user: this.auth.user(), unreadCount: 5 })
  }

  async index() {
    // 'appName' and 'user' are automatically merged into props
    return this.page('Users/Index', { users })
  }
}
```

---

## PageOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | `string` | Component name | Page title (`<title>`) |
| `status` | `number` | `200` | HTTP status code |
| `flash` | `Record<string, any>` | `null` | Flash data (shown once) |
| `version` | `string` | `null` | Asset version for cache busting |
| `layout` | `string \| false` | — | Layout template for HTML shell |
| `shared` | `Record<string, any>` | `{}` | Additional shared props |

---

## Flash Messages

Pass flash data that displays once then clears:

```ts
// Controller
async store() {
  const v = this.validate(this.body, { title: 'required' })
  if (v.fails()) {
    return this.page('Users/Create', { errors: v.errors }, {
      flash: { type: 'error', message: 'Validation failed' },
    })
  }
  await this.db.insert('users', { title: v.data.title })
  return this.redirect('/users', {
    flash: { type: 'success', message: 'User created!' },
  })
}
```

Flash data is available in the page props on the next request only.

---

## Frontend Setup (React)

### 1. HTML shell

The server generates this automatically from `PageResponse.toHtml()`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Users List</title>
</head>
<body>
  <div id="app" data-page='{"component":"Users/Index","props":{"users":[...]}}'></div>
  <script src="/public/app.js"></script>
</body>
</html>
```

### 2. Client-side entry (`public/app.js` or bundled via Vite)

```tsx
// public/app.tsx — minimal Inertia-like client
import { createRoot, type Root } from 'react-dom/client'

let root: Root | null = null

function renderPage(page: { component: string; props: Record<string, any> }) {
  const app = document.getElementById('app')!
  if (!root) root = createRoot(app)
  root.render(<Page component={page.component} props={page.props} />)
}

// First load: read from data-page
const el = document.getElementById('app')!
const page = JSON.parse(el.dataset.page || '{}')
renderPage(page)

// Subsequent navigations
document.addEventListener('click', async (e) => {
  const link = (e.target as HTMLElement).closest('a[data-inertia]')
  if (!link) return
  e.preventDefault()
  const url = (link as HTMLAnchorElement).href

  const res = await fetch(url, {
    headers: { 'X-Inertia': 'true', 'Accept': 'application/json' },
  })
  if (res.headers.get('X-Inertia') === 'true') {
    const page = await res.json()
    renderPage(page)
    window.history.pushState(page, '', url)
  }
})

// Component resolver
function Page({ component, props }: { component: string; props: any }) {
  const pages: Record<string, React.FC<any>> = {
    'Users/Index': () => <h1>Users</h1>,
    'Users/Show': () => <h1>User Detail</h1>,
  }
  const Component = pages[component]
  return Component ? <Component {...props} /> : <h1>Not Found</h1>
}
```

### 3. Bundle for production

```bash
# Build with Bun
bun build public/app.tsx --outdir public --target browser
```

---

## Full Example

See `examples/blog-app-inertia-react/` for a working blog application:

```
examples/blog-app-inertia-react/
├── routes/
│   ├── index.ts       # Redirect to /posts
│   ├── posts.ts       # Posts CRUD with this.page()
│   ├── admin.ts       # Admin panel
│   ├── comment.ts     # Comment moderation
│   └── login.ts       # Authentication
├── config/app.ts     # App configuration
└── dev.ts            # Entry point
```

### Route example with Inertia

```ts
// routes/posts.ts
import { Controller } from 'bunigniter'

interface Post {
  id: number; title: string; content: string
  created_at: string; user_id: number; author_name: string
}

export class Posts extends Controller {
  async index() {
    const posts = await this.db.query<Post>(
      'SELECT p.*, u.name as author_name FROM posts p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC'
    )
    return this.page('Posts/Index', {
      posts: posts.rows ?? [],
      user: this.auth.user(),
    }, { title: 'Blog Posts' })
  }

  async show(id: number) {
    const post = await this.db.first<Post>(
      'SELECT p.*, u.name as author_name FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?', [id]
    )
    if (!post) return this.notFound('Post not found')
    return this.page('Posts/Show', { post }, { title: post.title })
  }
}
```

---

## Protocol Details

### Request Headers

| Header | Value | When |
|--------|-------|------|
| `X-Inertia` | `true` | All Inertia navigation requests |
| `X-Inertia-Version` | asset version | Optional, for cache busting |
| `Accept` | `application/json` | Inertia navigation expects JSON |

### Response Headers

| Header | Value | When |
|--------|-------|------|
| `X-Inertia` | `true` | JSON response to Inertia requests |
| `Content-Type` | `application/json` | Subsequent navigation |
| `Content-Type` | `text/html` | First load (full page) |

### Response Body

**First load (HTML):**

```html
<!DOCTYPE html>
<html>
<head><title>Page Title</title></head>
<body>
  <div id="app" data-page='{JSON}'></div>
</body>
</html>
```

**Subsequent navigation (JSON):**

```json
{
  "component": "Users/Index",
  "props": { "users": [...] },
  "url": "/users",
  "version": null,
  "flash": null
}
```

---

## When to Use Inertia vs Traditional Views

| Feature | `this.view()` (Rendu/MDX/React) | `this.page()` (Inertia) |
|---------|-------------------------------|------------------------|
| Rendering | Server-side only | First load SSR, then client-side |
| Navigation | Full page reload | SPA-style (JSON swap) |
| SEO | ✅ Full HTML | ✅ First load is HTML |
| JavaScript | Optional | Required for navigation |
| Best for | Simple pages, docs, APIs | Interactive dashboards, admin panels |

---

## See Also

- [Template Engine Guide](template-engine.md) — Rendu, MDX, React SSR
- [Controller Guide](controller-lifecycle.md) — Request lifecycle, validation
- [Example App](../examples/blog-app-inertia-react/) — Full Inertia blog application
