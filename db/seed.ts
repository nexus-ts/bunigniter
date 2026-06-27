/**
 * Database seed — creates the users table.
 *
 * Run: `bun run db/seed.ts`
 */
import { Database } from 'bun:sqlite'

const db = new Database('app.db')

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
  )
`)

// Seed data
const existing = db.query('SELECT count(*) as count FROM users').get() as any
if (existing.count === 0) {
	db.run("INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')")
	db.run("INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com')")
	db.run("INSERT INTO users (name, email) VALUES ('Charlie', 'charlie@example.com')")
	console.log('[seed] 3 users created')
} else {
	console.log(`[seed] ${existing.count} users already exist, skipping`)
}

console.log('[seed] done')
db.close()
