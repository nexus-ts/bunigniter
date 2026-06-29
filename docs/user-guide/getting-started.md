# Getting Started

New to Bunigniter? This guide walks you through your first project step by step.

---

## Prerequisites

- [Bun](https://bun.sh) >= 1.3.0

```bash
# Install Bun (if you don't have it)
curl -fsSL https://bun.sh/install | bash
```

---

## 1. Create a Project

### Option A: Using the scaffolder (recommended)

```bash
bun create bunigniter@latest my-app
cd my-app
```

The scaffolder:

1. Creates `my-app/` directory
2. Installs Bunigniter
3. Launches an interactive wizard

### Option B: Using `bi new` directly

```bash
mkdir my-app && cd my-app
bun init -y
bun add bunigniter
bun run bi init --yes    # or without --yes for interactive prompts
```

### Option C: Add to an existing project

```bash
cd your-existing-project
bun add bunigniter
bun run bi init
```

This merges the necessary scripts and config files into your existing project.

---

## 2. Interactive Wizard

The wizard asks 5 questions. Here's what each means:

| # | Question | Choices | What it does |
|---|----------|---------|-------------|
| 1 | **Runtime** | `bun` / `cloudflare` | Bun-only uses SQLite; Cloudflare adds Workers + D1 files |
| 2 | **Database** | `sqlite` / `postgresql` / `mysql` / `none` | Sets the database dialect. "none" uses an in-memory JSON store |
| 3 | **OpenAPI** | `y` / `N` | Adds OpenAPI docs at `/openapi.json` + `/docs` |
| 4 | **Template** | `simple` / `todo` | Simple = welcome page. Todo = full CRUD app |
| 5 | **Install** | `Y` / `n` | Run `bun install` automatically |

---

## 3. Project Structure

After scaffolding, you'll have:

```
my-app/
├── config/
│   └── app.ts              ← 모든 설정 (DB, CORS, services, middleware)
├── routes/
│   ├── index.ts            ← 홈 컨트롤러
│   └── api.ts              ← API 핸들러
├── views/
│   ├── _layout.html        ← 자동 레이아웃
│   └── welcome.html        ← Rendu 템플릿
├── db/
│   └── seed.ts              ← 데이터베이스 시더
├── helpers/                 ← (database=none일 때 JSON 저장소)
├── dev.ts                   ← 엔트리 포인트
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

---

## 4. Run the App

```bash
# Seed the database (creates tables + sample data)
bun run seed

# Start the dev server
bun run dev

# Open http://localhost:3000
```

You should see the Bunigniter welcome page.

### Available Scripts

```bash
bun run dev          # Dev server with hot reload
bun run seed         # Create tables + seed data
bun run bi           # CLI help
bun run bi list      # Show all routes
bun run bi repl      # Interactive console
bun run bi make:controller <name>  # Scaffold a controller
```

---

## 5. Your First Route

Routes are TypeScript files in the `routes/` directory. The filename determines the URL path.

```ts
// routes/hello.ts → GET /hello
import { Controller } from 'bunigniter'

export class Hello extends Controller {
  async index() {
    return this.json({ message: 'Hello World!' })
  }
}
```

```bash
# Now visit http://localhost:3000/hello
{"message":"Hello World!"}
```

### Route Method Mapping

| Controller Method | HTTP Method | URL |
|------------------|-------------|-----|
| `index()` | `GET` | `/hello` |
| `show(id)` | `GET` | `/hello/:id` |
| `create()` | `POST` | `/hello` |
| `update(id)` | `PUT` | `/hello/:id` |
| `destroy(id)` | `DELETE` | `/hello/:id` |

---

## 6. Using the Database

```ts
// routes/items.ts
import { Controller } from 'bunigniter'

export class Items extends Controller {
  async index() {
    // CI-style query builder
    const items = await this.db.get('items')
    return this.json(items)
  }

  async create() {
    const data = this.request.only(['name', 'price'])
    await this.db.insert('items', data)
    return this.json({ ok: true }, 201)
  }
}
```

Full database reference: [Database Guide](database.md)

---

## 7. Rendering Views

```ts
// routes/page.ts
export class Page extends Controller {
  async index() {
    return this.view('welcome', {
      title: 'Hello',
      message: 'Welcome to my app!',
    })
  }
}
```

Bunigniter supports **3 template engines** — learn more in the [Template Guide](template-engine.md).

---

## 8. Next Steps

| I want to... | Read this |
|-------------|-----------|
| Understand the request API | [Request Input](request.md) |
| Validate user input | [Validation](helpers.md#validation) |
| Add authentication | [JWT Auth](jwt-auth.md) |
| Create a full CRUD | [Controller Lifecycle](controller-lifecycle.md) |
| Use WebSocket | [WebSocket](websocket.md) |
| Add file uploads | [File Upload](upload.md) |
| Deploy to production | [CLI Reference](cli-reference.md) (see `build:edge`) |
| Understand the architecture | [Architecture](../analysis/architecture.md) |
