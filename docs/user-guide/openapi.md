# OpenAPI Documentation

Bunigniter automatically generates OpenAPI 3.1 specs for all registered routes. A Scalar UI is served at `/docs` for interactive browsing.

## Quick Start

No configuration needed. Once the app is running:

| Endpoint | Description |
|----------|-------------|
| `GET /openapi.json` | OpenAPI 3.1 spec (JSON) |
| `GET /docs` | Interactive Scalar UI |

## Customizing Route Documentation

Use `OpenAPIRegistry.add()` to add descriptions, tags, and details to your routes:

```ts
// routes/posts.ts
import { OpenAPIRegistry } from 'bunigniter/helpers/openapi'

OpenAPIRegistry.add('/posts', 'GET', {
  summary: 'List all posts',
  description: 'Returns a paginated list of blog posts ordered by date',
  tags: ['Blog'],
})

OpenAPIRegistry.add('/posts/:id', 'GET', {
  summary: 'Get a post by ID',
  tags: ['Blog'],
  parameters: [
    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
  ],
  responses: {
    '200': { description: 'Post found' },
    '404': { description: 'Post not found' },
  },
})
```

## Available Fields

| Field | Type | Description |
|-------|------|-------------|
| `summary` | `string` | Short route description (appears in list) |
| `description` | `string` | Detailed explanation |
| `tags` | `string[]` | Group routes by tag (auto-collected) |
| `parameters` | `object[]` | Path/query/header parameters |
| `requestBody` | `object` | Request body schema |
| `responses` | `Record<string, object>` | Response descriptions per status code |
| `deprecated` | `boolean` | Mark route as deprecated |

## Route Parameters

Describe path parameters explicitly:

```ts
OpenAPIRegistry.add('/users/:id', 'GET', {
  summary: 'Get user',
  parameters: [
    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
    { name: 'fields', in: 'query', required: false, schema: { type: 'string' } },
  ],
})
```

Supported `in` values: `path`, `query`, `header`, `cookie`.

## Request Body

Document POST/PUT request bodies:

```ts
OpenAPIRegistry.add('/users', 'POST', {
  summary: 'Create user',
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
          },
          required: ['name', 'email'],
        },
      },
    },
  },
})
```

## Response Codes

Document multiple response status codes:

```ts
OpenAPIRegistry.add('/posts/:id', 'DELETE', {
  summary: 'Delete a post',
  responses: {
    '200': { description: 'Post deleted' },
    '401': { description: 'Unauthorized' },
    '404': { description: 'Post not found' },
  },
})
```

## Deprecating Routes

```ts
OpenAPIRegistry.add('/old-endpoint', 'GET', {
  summary: 'Old endpoint',
  deprecated: true,
})
```

## With HMVC Modules

Works the same way in modules:

```ts
// modules/blog/routes/posts.ts
import { OpenAPIRegistry } from 'bunigniter/helpers/openapi'

OpenAPIRegistry.add('/blog/posts', 'GET', {
  summary: 'List blog posts',
  tags: ['Blog'],
})

export class Posts extends Controller {
  async index() { ... }
}
```

## Without Registry (Auto-generated)

Routes without explicit documentation get auto-generated entries:

```json
{
  "/api/users/:id": {
    "get": {
      "summary": "GET /api/users/:id",
      "parameters": [
        { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
      ],
      "responses": {
        "200": { "description": "Successful response" }
      }
    }
  }
}
```

## Configuration

Customize the API info in `src/index.ts` where `openapi()` is called:

```ts
openapi(app, {
  title: 'My App API',
  version: '2.0.0',
  description: 'API documentation for My App',
})
```

## Example

```ts
// routes/posts.ts
import { Controller } from 'bunigniter'
import { OpenAPIRegistry } from 'bunigniter/helpers/openapi'

OpenAPIRegistry.add('/posts', 'GET', {
  summary: 'List all posts',
  description: 'Returns a paginated list of all blog posts',
  tags: ['Blog'],
})

OpenAPIRegistry.add('/posts', 'POST', {
  summary: 'Create a post',
  tags: ['Blog'],
  requestBody: {
    required: true,
    content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' } } } } },
  },
})

export class Posts extends Controller {
  async index() { ... }
  async create() { ... }
}
```

## Viewing Docs

Open `http://localhost:3000/docs` in a browser to see the interactive Scalar UI.
