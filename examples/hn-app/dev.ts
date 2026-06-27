/**
 * Hacker News App — entry point.
 *
 * Run: `bun run examples/hn-app/dev.ts`
 */
import { join } from 'node:path'
import { chdir } from 'node:process'

const appDir = join(import.meta.dirname)
chdir(appDir)

process.env.DB_FILENAME = join(appDir, 'data', 'hn.db')
process.env.DB_DIALECT = 'bun-sqlite'
process.env.ROUTER_PREFIX = ''
process.env.PORT = '3000'
process.env.APP_KEY = 'hn-dev-key-2026'
process.env.DEBUG = 'false'

console.log(`[hn] Starting from ${appDir}`)
console.log(`[hn] DB: ${process.env.DB_FILENAME}`)

const rootSrc = join(appDir, '..', '..', 'src', 'index.ts')
await import(rootSrc)
