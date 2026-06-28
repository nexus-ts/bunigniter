/**
 * Todo App — database seed.
 *
 * Creates the todos table and inserts sample data.
 *
 * Run: `bun run examples/todo-app/db/seed.ts`
 */
import { Database } from 'bun:sqlite'
import { join } from 'node:path'
import { mkdirSync, existsSync } from 'node:fs'

const DATA_DIR = join(import.meta.dirname, '..', 'data')
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

const dbPath = join(DATA_DIR, 'todo.db')
const db = new Database(dbPath)

// Enable WAL mode for better performance
db.run('PRAGMA journal_mode=WAL')

// Create tables
db.run(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'medium',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

// Seed data
const existing = db.query('SELECT count(*) as count FROM todos').get() as any
if (existing.count === 0) {
	db.run("INSERT INTO todos (title, priority) VALUES ('Learn Bunigniter', 'high')")
	db.run("INSERT INTO todos (title, priority) VALUES ('Build a Todo app', 'high')")
	db.run("INSERT INTO todos (title, priority, completed) VALUES ('Write docs', 'medium', 1)")
	db.run("INSERT INTO todos (title, priority) VALUES ('Add authentication', 'medium')")
	db.run("INSERT INTO todos (title, priority) VALUES ('Deploy to production', 'low')")
	console.log('[seed] 5 todos created')
} else {
	console.log(`[seed] ${existing.count} todos already exist`)
}

console.log('[seed] done')
db.close()
