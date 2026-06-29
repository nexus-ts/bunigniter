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

## React SSR (`.tsx`) vs Inertia-style (`this.page()`)

Bunigniter offers two React-based rendering approaches. Both are server-rendered on first load, but differ in how they handle subsequent navigation.

### Comparison

| Aspect | React SSR `.tsx` (`this.view()`) | Inertia-style (`this.page()`) |
|--------|----------------------------------|-------------------------------|
| **First request** | Full HTML via `renderToString()` | HTML shell with `data-page` JSON |
| **Subsequent nav** | Full page reload (new HTML) | JSON-only swap (`X-Inertia` header) |
| **Client JS required** | No — server HTML works standalone | Yes — must hydrate from `data-page` |
| **State persistence** | Lost on every navigation | Preserved (client mounts continuously) |
| **Navigation UX** | Traditional page flash | SPA-like smooth transitions |
| **Bundle size** | Minimal (can ship zero JS) | Larger (React + router + app code) |
| **SEO** | ✅ Full semantic HTML | ✅ First load is full HTML |

### Code Comparison

```ts
// React SSR (.tsx) — full HTML on every request
class Posts extends Controller {
  async index() {
    const posts = await this.db.query('SELECT * FROM posts')
    return this.view('PostsList', { posts })  // renders views/PostsList.tsx entirely
  }
}
// → Browser receives new full HTML each time
```

```ts
// Inertia-style — HTML first, then JSON only
class Posts extends Controller {
  async index() {
    const posts = await this.db.query('SELECT * FROM posts')
    return this.page('Posts/Index', { posts })  // first: HTML shell
  }                                              // later: { component, props }
}
// → After first load, navigation swaps JSON → no flash
```

### When to Choose

| Situation | Recommendation |
|-----------|---------------|
| Documentation site, blog, landing page | **React SSR `.tsx`** — simpler, no JS required |
| Admin dashboard with frequent interactions | **Inertia-style** — SPA UX without API sprawl |
| SEO-critical with minimal JS budget | **React SSR `.tsx`** |
| Real-time data, complex client state | **Inertia-style** — state persists across navigations |
| PHP/Laravel dev learning React | **React SSR `.tsx`** — `this.view()` is one consistent API |
| Team familiar with Inertia.js (Laravel) | **Inertia-style** — same mental model |

> **Summary:** `.tsx` is traditional SSR — the server renders full HTML on every request. Inertia-style is a hybrid SPA — the server renders HTML only on first load, then sends JSON for subsequent navigations. If you want zero-JS pages, use `.tsx`. If you want app-like navigation with React state, use `this.page()`.

---

## See Also

- [Template Engine Guide](template-engine.md) — Rendu, MDX, React SSR
- [Controller Guide](controller-lifecycle.md) — Request lifecycle, validation
- [Example App](../examples/blog-app-inertia-react/) — Full Inertia blog application
