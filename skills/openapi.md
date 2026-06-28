# OpenAPI Documentation

Auto-generated at `/openapi.json`. UI at `/docs`.

## Customize Route Docs

```ts
import { OpenAPIRegistry } from 'bunigniter/helpers/openapi'

OpenAPIRegistry.add('/posts', 'GET', {
  summary: 'List all posts',
  description: 'Returns all blog posts',
  tags: ['Blog'],
  responses: { '200': { description: 'Array of posts' } },
})

OpenAPIRegistry.add('/posts/:id', 'GET', {
  summary: 'Get post by ID',
  tags: ['Blog'],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
})
```

Call `OpenAPIRegistry.add()` at the top level of any route file.
