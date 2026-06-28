import { Database } from 'bun:sqlite'
import { join } from 'node:path'
import { mkdirSync, existsSync } from 'node:fs'
const dataDir = join(import.meta.dirname, '..', 'data')
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
const db = new Database(join(dataDir, 'blog.db'))
db.run('PRAGMA journal_mode=WAL')
db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, role TEXT DEFAULT 'author', created_at TEXT DEFAULT (datetime('now')))`)
db.run(`CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, content TEXT NOT NULL, excerpt TEXT, user_id INTEGER NOT NULL, published INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`)
db.run(`CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL, author TEXT NOT NULL, email TEXT, content TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))`)
if ((db.query('SELECT count(*) as c FROM users').get() as any).c === 0) {
  db.run("INSERT INTO users (username, password, role) VALUES ('admin','admin123','admin')")
  db.run("INSERT INTO users (username, password) VALUES ('alice','alice123')")
  db.run("INSERT INTO users (username, password) VALUES ('bob','bob123')")
  for (const p of [
    ['Getting Started with NexusTS','getting-started-nexusts','NexusTS is a Bun-native framework inspired by CodeIgniter. It combines Rendu, React SSR, and MDX.','A Bun-native framework for PHP devs.',1],
    ['Elysia v2 Multi-Runtime','elysia-v2-multi-runtime','Elysia v2 adds adapters for Bun, Node, Deno, and CF Workers.','Run anywhere with Elysia adapters.',1],
    ['Rendu Templates Guide','rendu-templates-guide','PHP-style templates with <?= ?> syntax. No build step.','PHP templates in TypeScript.',1],
    ['MDX in NexusTS','mdx-in-nexusts','Markdown with embedded React components. Best of both worlds.','Markdown with superpowers.',1],
    ['Session Management','session-management','AES-256-GCM encrypted cookie sessions. No Redis needed.','Secure sessions without server storage.',1],
    ['OpenAPI Auto-Docs','openapi-auto-docs','GET /openapi.json + Scalar UI at /docs. Zero config.','Auto API docs from routes.',1],
  ]) db.run('INSERT INTO posts (title,slug,content,excerpt,user_id) VALUES (?,?,?,?,?)', ...p)
  db.run("INSERT INTO comments (post_id,author,content) VALUES (1,'Charlie','Great article!')")
  db.run("INSERT INTO comments (post_id,author,content) VALUES (1,'Diana','How about AdonisJS?')")
  db.run("INSERT INTO comments (post_id,author,content) VALUES (3,'Eve','Finally! PHP templates in TS.')")
  console.log('[seed] 3 users, 6 posts, 3 comments')
} else console.log(`[seed] ${(db.query('SELECT count(*) as c FROM posts').get() as any).c} posts exist`)
