import { join } from 'node:path'; import { chdir } from 'node:process'
const d = join(import.meta.dirname); chdir(d)
process.env.DB_FILENAME = join(d, 'data', 'blog.db'); process.env.DB_DIALECT = 'bun-sqlite'
process.env.ROUTER_PREFIX = ''; process.env.PORT = '3002'; process.env.APP_KEY = 'blog-tsx-key'
await import(join(d, '..', '..', 'src', 'index.ts'))
