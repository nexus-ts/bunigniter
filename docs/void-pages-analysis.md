# Void Cloud Pages Routing — Analysis & Adoption Plan

**Date:** 2026-06-27
**Source:** https://void.cloud/guide/pages-routing/

---

## 1. What Void Does

Void Cloud is a fullstack framework built on Cloudflare Workers. Its pages routing system combines:

- **File-based routing** (`pages/` directory → URL paths)
- **Inertia-style protocol** (SSR first request, JSON subsequent)
- **Loader/Action pattern** (`.server.ts` companion files for data + mutations)
- **Framework-agnostic rendering** (React, Vue, Svelte, Solid — all first-party)
- **Vite-based build** (zero-config SSR + client bundles)

---

## 2. Void vs Current NexusTS — Side by Side

### 2.1 Directory Structure

**Void:**
```
pages/
├── layout.tsx              ← root layout (wraps all pages)
├── index.tsx                ← GET /
├── index.server.ts          ← loader + action for /
├── about.tsx                ← GET /about
├── users/
│   ├── layout.tsx           ← nested layout for /users/*
│   ├── index.tsx            ← GET /users
│   ├── index.server.ts      ← loader: returns { users }
│   ├── [id].tsx             ← GET /users/:id
│   └── [id].server.ts       ← loader: returns { user }
└── blog/
    ├── hello.md             ← Markdown page → /blog/hello
    └── archive.server.ts    ← API route (no page component)
```

**NexusTS (current):**
```
pages/
├── index.ts                 ← extends Controller { index() }
├── users.ts                 ← extends Controller { index(), show(id), create(), ... }
└── (no layouts, no .server.ts separation)
```

### 2.2 Data Loading Pattern

**Void — Loader (`.server.ts`):**
```ts
// pages/users/index.server.ts
import { defineHandler } from 'void'
import { db } from 'void/db'

export type Props = InferProps<typeof loader>

export const loader = defineHandler(async (c) => {
  return { users: await db.select().from(users) }
})
```

**Void — Page Component:**
```tsx
// pages/users/index.tsx
import type { Props } from './index.server'

export default function UsersPage({ users }: Props) {
  return (
    <ul>
      {users.map(u => <li key={u.id}>{u.name}</li>)}
    </ul>
  )
}
```

**NexusTS (current):**
```ts
// pages/users.ts
export class Users extends Controller {
  async index() {
    const result = await this.db.query('SELECT * FROM users')
    return this.json(result.rows)  // Raw JSON API, not page rendering
  }
}
```

### 2.3 Mutation Pattern

**Void — Action:**
```ts
// pages/users/index.server.ts
export const action = defineHandler.withValidator({
  body: insertUserSchema
})(async (c, { body }) => {
  await db.insert(users).values(body)
  // No return → re-runs loader, page re-renders
})
```

**Void — Client Form:**
```tsx
import { useForm } from '@void/react'

export default function CreateUser() {
  const form = useForm('/users/create', { name: '', email: '' })
  return (
    <form action={form.post}>
      <input name="name" value={form.data.name} onChange={e => form.setData('name', e.target.value)} />
      {form.errors.name && <span>{form.errors.name}</span>}
      <button disabled={form.pending}>Create</button>
    </form>
  )
}
```

**NexusTS (current — no client integration):**
```ts
// pages/users.ts
async create() {
  const result = await this.db.query(
    'INSERT INTO users (name, email) VALUES (?, ?) RETURNING *',
    [this.body.name, this.body.email]
  )
  return this.json(result.rows[0], 201)
}
```

### 2.4 Layout System

**Void — Nested Layouts:**
```tsx
// pages/layout.tsx — root layout
import { Link } from '@void/react'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/users">Users</Link>
      </nav>
      <main>{children}</main>
    </>
  )
}
```

Layouts nest automatically: `pages/layout.tsx` wraps `pages/users/layout.tsx` wraps `pages/users/[id].tsx`. Named layouts (`pages/_layouts/landing.tsx`) allow per-page overrides.

**NexusTS (current):** No layout system.

---

## 3. Key Design Decisions to Adopt

### 3.1 Separation: Component vs Server Logic

**Void's pattern:** `users/index.tsx` (component) + `users/index.server.ts` (loader/action)

This separation is cleaner than NexusTS's `users.ts` (Controller with methods) because:

| Concern | Void | NexusTS (current) |
|---------|------|-------------------|
| **What data to load** | `loader` in `.server.ts` | Controller method |
| **How to render** | Default export in `.tsx` | `this.json()` or `this.page()` |
| **What mutations** | `action` in `.server.ts` | Controller `create()`, `update()` |
| **Type contract** | `InferProps<typeof loader>` | Manual type annotation |
| **Can swap framework** | Change adapter only | Tied to Controller class |

**Proposal:** Adopt the `.server.ts` companion file pattern. Keep `Controller` for API-only routes (in `routes/`). Use `pages/*.tsx` + `pages/*.server.ts` for page routes.

### 3.2 Loader Pattern

```ts
// pages/users/index.server.ts
import { defineLoader } from 'nexusts'
import type { InferProps } from 'nexusts'

export type Props = InferProps<typeof loader>

export const loader = defineLoader(async (c) => {
  const users = await c.db.query('SELECT id, name, email FROM users')
  return { users: users.rows }
})
```

Key features to copy:
- **`defineLoader`** — typed handler with DB, session, auth context
- **`InferProps`** — extract return type for the component
- **`defer()`** — streaming slow data (analytics, AI inference)
- **`ssr = false`** — opt individual routes out of SSR
- **No return** from action = auto re-run loader

### 3.3 Action Pattern

```ts
// pages/users/create.server.ts
import { defineAction } from 'nexusts'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email()
})

export const action = defineAction({
  body: schema
}, async (c, { body }) => {
  await c.db.query('INSERT INTO users (name, email) VALUES (?, ?)', [body.name, body.email])
  // Auto: re-run loader, page re-renders with fresh data
})
```

Key features to copy:
- **`defineAction`** — with optional `body` schema
- **Named actions** — `actions.update`, `actions.delete` for multiple mutations per page
- **Validation errors** — automatic `form.errors` population
- **Redirect** — `return c.redirect('/users')` for post-redirect-get
- **No return** = re-run loader = page refresh

### 3.4 Client Integration

```tsx
// components/UsersList.tsx
import { Link, useForm } from '@nexusts/react'

export function UsersList({ users }: Props) {
  const form = useForm('/users', { name: '', email: '' })
  return (
    <form action={form.post}>
      <input name="name" value={form.data.name} onChange={e => form.setData('name', e.target.value)} />
      <button disabled={form.pending}>Create</button>
    </form>
  )
}
```

Client package (`@nexusts/react`, `@nexusts/vue`, `@nexusts/svelte`) to provide:
- **`useForm(url, initial)`** — form state, validation errors, dirty tracking, file uploads
- **`Link`** — client-side navigation (intercepts clicks, fetches via Inertia protocol)
- **`useRouter()`** — programmatic `router.visit()`, `router.refresh()`
- **`useParams()`** — typed dynamic route params
- **`useShared()`** — global middleware data (current user, etc.)

### 3.5 Layout System

```tsx
// pages/layout.tsx — wraps all pages
import { Link } from '@nexusts/react'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav><Link href="/">Home</Link><Link href="/users">Users</Link></nav>
      <main>{children}</main>
    </div>
  )
}
```

```tsx
// pages/users/layout.tsx — wraps only /users/*
export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <aside>User sidebar</aside>
      <section>{children}</section>
    </div>
  )
}
```

Layout features to copy:
- **Automatic nesting** — closest `layout.tsx` wraps the page
- **Named layouts** — `pages/_layouts/landing.tsx` with per-page opt-in
- **`layout: false`** — no layout for fullscreen pages
- **`layout: '!landing'`** — exclusive layout (skip ancestors)
- **`useShared()`** — middleware data accessible in layouts

### 3.6 Directory Structure (Proposed)

```
pages/
├── layout.tsx                    ← root layout
├── index.tsx                     ← GET /
├── index.server.ts               ← loader + action for /
├── users/
│   ├── layout.tsx                ← nested layout
│   ├── index.tsx                 ← GET /users
│   ├── index.server.ts           ← loader: { users }
│   ├── [id].tsx                  ← GET /users/:id
│   ├── [id].server.ts            ← loader: { user }
│   ├── create.tsx                ← GET /users/create
│   └── create.server.ts          ← action
├── docs/
│   └── hello.md                  ← Markdown page → /docs/hello
└── _layouts/
    ├── landing.tsx               ← named layout
    └── post.tsx                  ← named layout
```

---

## 4. Implementation Phases

### Phase A: Loader + Action Runtime (Week 1)

**Goal:** `.server.ts` files work with `defineLoader` and `defineAction`.

```ts
// src/pages/loader.ts
export function defineLoader<T>(fn: (c: PageContext) => Promise<T>): (c: PageContext) => Promise<T> {
  return fn
}

export function defineAction<T>(config: ActionConfig, fn: (c: PageContext, args: T) => Promise<void>) {
  return { config, fn }
}
```

**Files to create:**
- `src/pages/loader.ts`
- `src/pages/action.ts`
- `src/router/page-router.ts` — scans `.server.ts` files, registers loaders/actions

**Files to modify:**
- `src/router/file-router.ts` — add `.server.ts` companion detection
- `src/index.ts` — register page router

**Estimated effort:** 2–3 days

### Phase B: Vite Plugin (Week 1–2)

**Goal:** Build React/Vue components with HMR, generate SSR + client bundles.

```
npm install @nexusts/react
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { nexus } from '@nexusts/vite'

export default defineConfig({
  plugins: [nexus({ framework: 'react' })]
})
```

**Files to create:**
- `packages/vite-plugin/` — the main plugin
- `packages/react/` — React adapter + `Link`, `useForm`, `useRouter`
- `packages/vue/` — Vue adapter

**Estimated effort:** 5–7 days

### Phase C: Client Package (Week 2–3)

**Goal:** `useForm`, `Link`, `useRouter` work in the browser.

```tsx
// Client router — Inertia protocol
router.visit('/users')        // fetch + swap
router.refresh()              // re-fetch current page
router.visit('/logout', { method: 'POST' })

// Link component
<Link href="/users">Users</Link>
<Link href={`/users/${id}`}>View</Link>

// Form helper
const form = useForm('/users', { name: '' })
form.post()                   // POST + re-render
form.errors.name              // validation errors
form.pending                  // loading state
```

**Files to create:**
- `packages/client-core/` — shared Inertia protocol logic
- `packages/react/src/` — React bindings
- `packages/vue/src/` — Vue bindings

**Estimated effort:** 5–7 days

### Phase D: Layout System (Week 3)

**Goal:** Nested layouts with automatic wrapping.

```tsx
// pages/layout.tsx → wraps all pages
// pages/users/layout.tsx → wraps only /users/*
// pages/_layouts/landing.tsx → named, opt-in
```

**Files to modify:**
- `src/router/page-router.ts` — layout chain resolution
- `packages/react/src/` — layout rendering in SSR + client

**Estimated effort:** 2–3 days

---

## 5. Key Differences from Void (Advantages for NexusTS)

| Area | Void | NexusTS (proposed) | Why NexusTS has an edge |
|------|------|-------------------|------------------------|
| **Runtime** | Cloudflare Workers only | Bun + CF Workers + Node + Deno | Elysia v2 adapters = wider reach |
| **DB** | Drizzle (tied to Workers) | Drizzle + raw SQL + 5 dialects | CodeIgniter users prefer raw SQL |
| **File router** | Pages only | Pages + API routes (Controller) | Both UI and API in one project |
| **Controller** | None (only components) | Optional: `extends Controller` | PHP migrants feel at home |
| **CLI** | `void init` | `nx make:controller/model` | Scaffolding for rapid development |
| **Template fallback** | None (React/Vue only) | Eta/Edge for simple pages | No JS bundle for static pages |

---

## 6. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| **Vite complexity** | Medium | Start with React only, add Vue/Svelte later |
| **Client bundle size** | Low | Tree-shaking via Elysia v2 |
| **Elysia v2 stability** | High (blocked) | Build on v1.4 API subset, migrate when v2 stable |
| **PHP devs don't know React** | Medium | Keep `extends Controller` for API routes; offer Eta fallback |
| **SSR performance** | Low | Cache + `defer()` for heavy pages |
| **Too much scope** | Medium | Phase B+C are large. Validate with Phase A first (Void-style loader + server component rendering without full client router) |

---

## 7. Minimal Viable First Step

Before building the full client router + Vite plugin, validate the pattern with a minimal Phase A:

```ts
// pages/users/index.server.ts
export const loader = defineLoader(async () => {
  return { users: await db.query('SELECT * FROM users') }
})
```

```tsx
// pages/users/index.tsx (server-rendered to HTML, no client JS yet)
export default function UsersPage({ users }: Props) {
  return (
    <ul>
      {users.map(u => <li>{u.name}</li>)}
    </ul>
  )
}
```

The framework:
1. Scans `pages/*.server.ts` for `loader` exports
2. Runs the loader on `GET` requests
3. Renders the paired `.tsx` component to HTML (via `react-dom/server`)
4. Serves the full HTML (no Inertia protocol yet)

This validates the **data + component pattern** without building the client router. Once this works, Phase B+C add the Inertia protocol and SPA navigation.

**Estimated effort for MVP:** 1–2 days

---

## 8. Recommendation

**Adopt Void's pattern fully.** The `.server.ts` + component separation is cleaner than the Controller class for UI pages. Keep `Controller` for API routes.

Specific actions:

1. **Phase A now** — Build `defineLoader`/`defineAction` runtime + `.server.ts` scanning. This is the foundation.
2. **Update roadmap** — Replace "View Engine" with "Inertia-style Pages" as the primary view system.
3. **Keep `Controller`** — For API routes (`routes/`) and for PHP devs who prefer it. `pages/` uses components, `routes/` uses Controllers.
4. **Void compatibility** — Document Void patterns in our docs. Void users should feel at home in NexusTS.

---

## References

- [Void Pages Overview](https://void.cloud/guide/pages-routing/overview)
- [Void Loaders](https://void.cloud/guide/pages-routing/loaders)
- [Void Actions & Forms](https://void.cloud/guide/pages-routing/actions-and-forms)
- [Void Layouts](https://void.cloud/guide/pages-routing/layouts)
- [NexusTS View Engine Design](../view-engine-design.md)
- [Elysia v2 Analysis](../elysia-v2-analysis.md)
