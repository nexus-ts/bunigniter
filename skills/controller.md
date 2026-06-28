# Controller — Creating Routes

## File Location
`routes/<name>.ts`

## Pattern
```ts
import { Controller } from '@nexusts/core'

export class <Name> extends Controller {
  async index() { ... }     // GET  /<name>
  async show(id) { ... }    // GET  /<name>/:id
  async create() { ... }    // POST /<name>
  async update(id) { ... }  // PUT  /<name>/:id
  async destroy(id) { ... } // DELETE /<name>/:id
}
```

## Rules
- Only methods that exist are registered (no unused routes)
- Import from `@nexusts/core`, NOT relative paths
- `_before()` runs before every method (return Response to short-circuit)
- Use `this.validate(body, rules)` for input validation
- Use `this.db.get/insert/update/delete` for queries
- Use `this.view(name, props)` for HTML templates
- Use `this.json(data)` for API responses
