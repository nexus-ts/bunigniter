# Todo App — NexusTS Example

A full-stack Todo application demonstrating NexusTS features:

- **File-based routing** (`pages/todos.ts` → `/todos`)
- **Inertia-style page rendering** (`this.page()` → HTML/JSON)
- **SQLite database** with CRUD operations
- **Input validation** (string rules + priority check)
- **Query filtering** (by status, priority, search)
- **Page redirect** (`/` → `/todos`)

## Quick Start

```bash
# From the project root
cd examples/todo-app

# Seed the database
bun run ../..//db/seed.ts
# Or directly:
bun run ../../examples/todo-app/db/seed.ts
```

Wait — the seed is at `examples/todo-app/db/seed.ts` but needs to be run from the root:

```bash
# From project root
bun run examples/todo-app/db/seed.ts
bun run src/index.ts
```

## Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Redirect to `/todos` |
| `GET` | `/todos` | List todos (HTML or JSON) |
| `GET` | `/todos?filter=active` | Filter by status |
| `GET` | `/todos?q=search` | Search by title |
| `GET` | `/todos?priority=high` | Filter by priority |
| `POST` | `/todos` | Create a todo |
| `PUT` | `/todos/:id` | Toggle complete / edit |
| `DELETE` | `/todos/:id` | Delete a todo |

## API Usage

```bash
# List (Inertia JSON)
curl -H "X-Inertia: true" http://localhost:3000/todos

# Create
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"My task","priority":"high"}'

# Toggle complete
curl -X PUT http://localhost:3000/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'

# Delete
curl -X DELETE http://localhost:3000/todos/1
```

## Page

The `GET /todos` endpoint returns an Inertia-style page:
- **First request (no X-Inertia header)**: Full HTML shell with `data-page` attribute containing the JSON data
- **Subsequent requests (X-Inertia header)**: Pure JSON with `{ component, props }`

The page component is named `TodoApp` and receives these props:
```json
{
  "todos": [{ "id": 1, "title": "...", "completed": false, "priority": "high" }],
  "stats": { "total": 5, "completed": 1, "active": 4 },
  "filter": "all",
  "search": ""
}
```
