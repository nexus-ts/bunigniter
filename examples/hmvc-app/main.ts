import { join } from 'node:path'; import { chdir } from 'node:process'
const d = join(import.meta.dirname); chdir(d)
process.env.DB_FILENAME = join(d, 'data', 'hmvc.db'); process.env.DB_DIALECT = 'bun-sqlite'
process.env.ROUTER_PREFIX = ''; process.env.PORT = '3000'
await import(join(d, '..', '..', 'src', 'index.ts'))
