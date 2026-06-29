/**
 * Simple App — CodeIgniter 3-style welcome page.
 *
 * Minimal Bunigniter example: one route, one view, no database.
 * Run: `bun run examples/simple-app/main.ts`
 */
import { join } from 'node:path'
import { chdir } from 'node:process'

const appDir = join(import.meta.dirname)
chdir(appDir)

process.env.ROUTER_PREFIX = ''
process.env.PORT = '3000'
process.env.APP_KEY = 'simple-app-dev-key'
if (!process.env.DEBUG) process.env.DEBUG = 'true'

console.log(`[simple-app] Starting from ${appDir}`)
console.log(`[simple-app] Open http://localhost:3000`)

const rootSrc = join(appDir, '..', '..', 'src', 'index.ts')
await import(rootSrc)
