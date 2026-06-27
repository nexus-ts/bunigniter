# Inertia-style View Engine — Design Proposal

**Date:** 2026-06-27
**Status:** Proposed (Phase 2 candidate)
**Pattern:** Server-rendered SPA via React/Vue components
**Inspiration:** Laravel Inertia.js, AdonisJS Inertia, Rails Hotwire

---

## 1. Why Not a Traditional Template Engine?

PHP developers know **two things**: jQuery (declining) and **React/Vue** (rising fast). Teaching them Rendu, Eta, or Edge template syntax is friction. The 2026 TypeScript ecosystem has a massive React/Vue talent pool.

### Traditional Template Engine (v1 idea)

```ts
export class Users extends Controller {
  async index() {
    const users = await this.db.query('SELECT * FROM users')
    return this.view('users/list', { users })
    //        ~~~~~  ~~~~~~~~~~   ~~~~~~~~~
    //        Need to learn Rendu syntax. Need template files. Need layouts.
  }
}
```

Requires:
- Learning a new template language (Rendu/Eta/Edge)
- Setting up template directories
- Writing HTML with template tags — feels like going back to 2010

### Inertia-style (proposed)

```tsx
// pages/users.tsx — yes, .tsx in the pages folder
import { Controller } from 'nexusts'
import { UsersList } from '../components/UsersList'

export class Users extends Controller {
  async index() {
    const users = await this.db.query('SELECT * FROM users')
    return this.page('Users/List', { users })
    //        ~~~~    ~~~~~~~~~~   ~~~~~~~~
    //        Returns a page object. React/Vue component renders it.
  }
}
```

**The user writes React/Vue — no new template language.**

---

## 2. How It Works

### 2.1 First Request (Full HTML)

```
Browser                    NexusTS Server
   │                            │
   │── GET /users ──────────────▶│
   │                            │
   │                            ├─ Controller.index()
   │                            ├─ this.page('Users/List', { users })
   │                            │
   │                            ├─ Render React/Vue component to HTML
   │                            ├─ Inject data-page JSON into HTML shell
   │                            │
   │◀──── Full HTML page ───────┤
   │     <div id="app" data-page='{"component":"Users/List",...}'>
   │     <script src="/assets/app.js">
   │
   │── Load app.js ────────────▶│
   │     (React/Vue client bundle)
```

### 2.2 Subsequent Navigation (XHR/JSON)

```
Browser                    NexusTS Server
   │                            │
   │── GET /users/1 ───────────▶│
   │   X-Inertia: true          │
   │                            │
   │◀─── JSON response ─────────┤
   │   { component: "Users/Show", props: { user: {...} }, ... }
   │
   ├─ React/Vue swaps the page  │
   ├─ No full reload            │
   ├─ History API updates URL   │
```

### 2.3 Form Submission

```
Browser                    NexusTS Server
   │                            │
   │── POST /users ────────────▶│
   │   X-Inertia: true          │
   │   { name: "...", ... }     │
   │                            │
   │◀── 302 Redirect ───────────┤
   │   X-Inertia-Location: /users
   │
   │── GET /users (X-Inertia) ─▶│
   │◀── JSON: component, props ─┤
```

---

## 3. API Design

### 3.1 Controller

```tsx
// pages/users.tsx
import { Controller } from 'nexusts'
import type { User } from '../types'

export class Users extends Controller {
  async index() {
    const users = await this.db.all<User>('SELECT id, name, email FROM users')
    return this.page('Users/Index', { users })
  }

  async show(id: number) {
    const user = await this.db.first<User>('SELECT * FROM users WHERE id = ?', [id])
    if (!user) return this.page('Errors/NotFound', {}, { status: 404 })
    return this.page('Users/Show', { user })
  }

  async create() {
    const body = this.validate(this.body, {
      name: 'required|min:2',
      email: 'required|email'
    })

    if (body.fails()) {
      // Re-render form with validation errors + old input
      return this.page('Users/Create', {
        errors: body.errors(),
        old: this.body
      })
    }

    await this.db.query('INSERT INTO users (name, email) VALUES (?, ?)',
      [body.name, body.email])

    // Flash message + redirect
    return this.page('Users/Index', {}, {
      flash: { type: 'success', message: 'User created!' }
    }).redirect('/users')
  }
}
```

### 3.2 Page Helper

```ts
// Controller base class addition
class Controller {
  protected page(
    component: string,       // React/Vue component name
    props: Record<string, any> = {},
    options?: PageOptions
  ): PageResponse {
    return new PageResponse(component, props, {
      version: this.config.version,   // asset version for cache bust
      sharedProps: this._sharedProps, // global props (currentUser, etc.)
      ...options
    })
  }
}

interface PageOptions {
  status?: number           // HTTP status (404, 500, etc.)
  flash?: Record<string, any>
  redirect?: string         // Force client-side redirect
}
```

### 3.3 React/Vue Components

```tsx
// resources/components/Users/Index.tsx
export default function UsersIndex({ users }: { users: { id: number; name: string; email: string }[] }) {
  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map(u => (
          <li key={u.id}>
            <a href={`/users/${u.id}`} onClick={e => {
              e.preventDefault()
              router.visit(`/users/${u.id}`)  // Inertia-style navigation
            }}>
              {u.name} ({u.email})
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

```tsx
// resources/components/App.tsx — root layout
import { router, usePage } from 'nexusts/client'

export default function App({ children }: { children: React.ReactNode }) {
  const { component, props } = usePage()

  return (
    <html>
      <head>
        <title>{props.title ?? 'My App'}</title>
        {router.assetUrl && <link rel="stylesheet" href={router.assetUrl('app.css')} />}
      </head>
      <body>
        <nav>
          <a href="/" onClick={e => { e.preventDefault(); router.visit('/') }}>
            Home
          </a>
        </nav>
        <main>
          <Page component={component} props={props} />
        </main>
        {props.flash && <FlashMessage {...props.flash} />}
      </body>
    </html>
  )
}
```

---

## 4. SSR vs SPA Mode

### 4.1 SSR Mode (default, recommended)

```
Request → Render React/Vue to HTML string → Inject into HTML shell → Response
```

**Benefits:**
- SEO-friendly (search engines see full HTML)
- Fast first paint (no JS needed to see content)
- Progressive enhancement works

**Dependencies:**
- `react-dom/server` or `@vue/server-renderer`
- Component bundle (Vite-built)

### 4.2 SPA Mode (lighter, API-only)

```
Request → Return JSON page object → Client renders
```

**Benefits:**
- Zero server rendering overhead
- Smaller server bundle
- Pure JSON API is easier to debug

**Dependencies:**
- Client-side React/Vue app
- `@inertiajs/react` or `@inertiajs/vue3`

### 4.3 Hybrid (auto-detect)

The framework detects Inertia header and chooses mode:

```ts
// Internal logic
if (ctx.headers.get('X-Inertia')) {
  return json({ component, props, ... })  // SPA
} else {
  return html(renderToString(component, props))  // SSR
}
```

---

## 5. Asset Management (Vite Integration)

For SSR to work, we need Vite to build the client bundle and the server component registry.

```ts
// config/app.ts
export default {
  vite: {
    entry: 'resources/app.tsx',
    outDir: 'public/assets',
    ssrEntry: 'resources/ssr.tsx'     // server-side component registry
  }
}
```

### 5.1 Development Mode

```ts
// Vite dev server runs in background
// Framework proxies asset requests to Vite
// Hot Module Replacement works automatically
app.get('/assets/:file', async (ctx) => {
  return fetch(`http://localhost:5173/assets/${ctx.params.file}`)
})
```

### 5.2 Production Mode

```ts
// Vite build produces static files
// Framework reads manifest.json for asset URLs
app.use(staticFiles('public/assets'))
```

---

## 6. Comparison with Alternatives

| Feature | Traditional Templates (Rendu/Eta) | Inertia-style (proposed) |
|---------|-----------------------------------|------------------------|
| **Learning curve** | Learn new syntax | Use existing React/Vue knowledge |
| **Developer pool** | Niche | **Massive** (millions of React/Vue devs) |
| **PHP migrant fit** | "This feels like 2010" | "This is what I already know" |
| **SEO** | ✅ Full HTML | ✅ Full HTML (SSR mode) |
| **First paint** | ✅ Fast | ✅ Fast (SSR) |
| **Client interactivity** | ❌ jQuery/vanilla JS | ✅ React/Vue full power |
| **Hot reload** | ❌ Manual refresh | ✅ Vite HMR |
| **Server rendering cost** | Low (string interpolation) | Medium (React/Vue renderToString) |
| **Bundle size** | Zero (server-only) | Client JS bundle required |
| **API reusability** | ❌ Templates only | ✅ Page props = API contract |

---

## 7. Implementation Plan

### Step 1: Core Page Response (2–3 days)

```ts
// src/view/page.ts
export class PageResponse {
  constructor(
    public component: string,
    public props: Record<string, any>,
    public options: PageOptions = {}
  ) {}

  toInertiaJson() { ... }     // X-Inertia response
  toJson() { ... }             // Plain JSON (API consumers)
  setRedirect(url: string) { ... }
}
```

### Step 2: SSR Adapter (2–3 days)

```ts
// src/view/ssr/react.tsx
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'

export function renderReactPage(component: string, props: any, registry: ComponentRegistry) {
  const Component = registry.get(component)
  const html = renderToString(createElement(Component, props))
  return layoutHtml(html, { component, props })
}
```

### Step 3: Client Package (3–5 days)

```ts
// client/index.ts — published as @nexusts/client
import { createRouter } from './router'
import { Page } from './page'

export const router = createRouter({
  // Handles visit(), get(), post(), replace()
  // Manages history state
  // Fetches pages via X-Inertia
  // Progress bar during navigation
})
```

### Step 4: Vite Plugin (2 days)

```ts
// src/plugin/vite.ts
export function nexusVitePlugin(options: ViteOptions) {
  // Registers React/Vue components
  // Builds client bundle
  // Provides HMR in development
}
```

**Total estimated effort:** 9–13 days

---

## 8. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| **React/Vue SSR is expensive** | Medium | Implement caching (`this.page.cache(ttl)`) |
| **Complexity of client router** | Medium | Start with basic `visit()` only, add features later |
| **Bundle size too large** | Low | Tree-shaking via Elysia v2 TypeBox-free base |
| **PHP developers don't know React** | Medium | Support Eta/Edge as fallback template engine |
| **Elysia v2 stability** | High | Phase 5 (blocked until v2.0 stable) |

---

## 9. Recommendation

**Proceed.** This is the right view engine strategy for NexusTS.

The traditional template engine path (Rendu/Eta/Edge) would require:
- Writing and maintaining 3 adapters
- Teaching users a new syntax
- Building a template ecosystem from scratch

The Inertia-style path requires:
- One well-designed SSR adapter
- Leveraging the existing React/Vue ecosystem
- Giving PHP developers what they already use or want to learn

**Decision:** Build the Inertia-style engine as the PRIMARY view system. Keep Eta/Edge as a secondary option for simple pages that don't need React/Vue interactivity.

---

## References

- [Inertia.js Protocol](https://inertiajs.com/the-protocol)
- [AdonisJS Inertia](https://docs.adonisjs.com/guides/inertia)
- [Laravel Inertia](https://inertiajs.com/server-side-setup)
- [Elysia v2 kiana Analysis](../elysia-v2-analysis.md)
