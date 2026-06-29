/**
 * Pet Store — entry point.
 * Run: `bun run examples/petstore/main.ts`
 */
import { join } from 'node:path'
import { chdir } from 'node:process'

const appDir = join(import.meta.dirname)
chdir(appDir)

process.env.DB_FILENAME = join(appDir, 'data', 'petstore.db')
process.env.DB_DIALECT = 'bun-sqlite'
process.env.ROUTER_PREFIX = ''
process.env.PORT = '3000'
process.env.APP_KEY = 'petstore-dev-key-2026'
process.env.DEBUG = 'true'

console.log(`[petstore] Starting from ${appDir}`)
console.log(`[petstore] DB: ${process.env.DB_FILENAME}`)

await import(join(appDir, '..', '..', 'src', 'index.ts'))
