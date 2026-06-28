import { Database } from 'bun:sqlite'; import { join } from 'node:path'; import { mkdirSync, existsSync } from 'node:fs'
const dir = join(import.meta.dirname, '..', 'data'); if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
const db = new Database(join(dir, 'hmvc.db'))
db.run('PRAGMA journal_mode=WAL')
db.run('CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL, stock INTEGER DEFAULT 0)')
db.run('CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, body TEXT, created_at TEXT DEFAULT (datetime(\'now\')))')
if ((db.query('SELECT count(*) as c FROM products').get() as any).c === 0) {
  db.run("INSERT INTO products (name, price, stock) VALUES ('Widget', 9.99, 100)")
  db.run("INSERT INTO products (name, price, stock) VALUES ('Gadget', 24.99, 50)")
  db.run("INSERT INTO products (name, price, stock) VALUES ('Doohickey', 4.99, 200)")
  db.run("INSERT INTO posts (title, body) VALUES ('Welcome', 'Welcome to our HMVC demo!')")
  db.run("INSERT INTO posts (title, body) VALUES ('HMVC Pattern', 'Modules have their own routes and views.')")
  console.log('[seed] 3 products, 2 posts')
} else console.log('[seed] already seeded')
