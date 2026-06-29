/**
 * Todo App — entry point.
 *
 * Run: `bun run examples/todo-app/main.ts`
 */
import { join } from 'node:path'
import { chdir } from 'node:process'

const todoDir = join(import.meta.dirname)
chdir(todoDir)

// Set up environment for the todo app
process.env.DB_FILENAME = join(todoDir, 'data', 'todo.db')
process.env.DB_DIALECT = 'bun-sqlite'
process.env.ROUTER_PREFIX = ''
process.env.PORT = '3000'

console.log(`[todo] Starting from ${todoDir}`)
console.log(`[todo] DB: ${process.env.DB_FILENAME}`)

// Import the framework entry point
const rootSrc = join(todoDir, '..', '..', 'src', 'index.ts')
await import(rootSrc)
