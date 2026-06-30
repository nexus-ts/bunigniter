/**
 * Hacker News — database seed.
 *
 * Creates tables and inserts sample data.
 * Run: `bun run examples/hn-app/db/seed.ts`
 */
import { Database } from 'bun:sqlite'
import { join } from 'node:path'
import { mkdirSync, existsSync } from 'node:fs'

const dataDir = join(import.meta.dirname, '..', 'data')
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

const db = new Database(join(dataDir, 'hn.db'))
db.run('PRAGMA journal_mode=WAL')

db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
)`)

db.run(`CREATE TABLE IF NOT EXISTS stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT,
  text TEXT,
  user_id INTEGER NOT NULL,
  points INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
)`)

db.run(`CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id INTEGER NOT NULL,
  parent_id INTEGER,
  user_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
)`)

db.run(`CREATE TABLE IF NOT EXISTS votes (
  user_id INTEGER NOT NULL,
  story_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, story_id)
)`)

// Seed sample data
const existing = db.query('SELECT count(*) as c FROM stories').get() as any
if (existing.c === 0) {
  db.run("INSERT INTO users (username, password) VALUES ('alice', 'password123')")
  db.run("INSERT INTO users (username, password) VALUES ('bob', 'password123')")
  db.run("INSERT INTO users (username, password) VALUES ('charlie', 'password123')")

  db.run("INSERT INTO stories (title, url, user_id, points) VALUES ('Bunigniter — Bun-native fullstack framework', 'https://github.com/kabyeon/bunigniter', 1, 15)")
  db.run("INSERT INTO stories (title, url, user_id, points) VALUES ('Bun 1.3 released with improved performance', 'https://bun.sh', 2, 42)")
  db.run("INSERT INTO stories (title, text, user_id, points) VALUES ('Show HN: I built a Hacker News clone in one hour', 'It uses Bunigniter with SQLite and Rendu templates. Check it out!', 1, 87)")
  db.run("INSERT INTO stories (title, url, user_id, points) VALUES ('TypeScript 6.0: What is new', 'https://typescriptlang.org', 3, 33)")
  db.run("INSERT INTO stories (title, text, user_id, points) VALUES ('Ask HN: What framework do you use in 2026?', 'I am curious what everyone is using for new projects these days.', 2, 56)")

  db.run("INSERT INTO comments (story_id, user_id, text) VALUES (1, 2, 'This looks really promising! PHP developers will love it.')")
  db.run("INSERT INTO comments (story_id, user_id, text) VALUES (1, 3, 'How does it compare to AdonisJS?')")
  db.run("INSERT INTO comments (story_id, user_id, text) VALUES (3, 3, 'Haha this is meta')")
  db.run("INSERT INTO comments (story_id, user_id, text) VALUES (3, 1, 'The framework is great for prototyping!')")
  db.run("INSERT INTO comments (story_id, user_id, text) VALUES (5, 1, 'I use Bunigniter for everything now')")

  db.run("INSERT INTO votes (user_id, story_id) VALUES (2, 1)")
  db.run("INSERT INTO votes (user_id, story_id) VALUES (3, 3)")

  console.log('[seed] Created 5 users, 5 stories, 5 comments')
} else {
  console.log(`[seed] ${existing.c} stories already exist`)
}

console.log('[seed] done')
