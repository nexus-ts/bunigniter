import { Database } from 'bun:sqlite'
import { join } from 'node:path'
import { mkdirSync, existsSync } from 'node:fs'

const dataDir = join(import.meta.dirname, '..', 'data')
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
const db = new Database(join(dataDir, 'petstore.db'))
db.run('PRAGMA journal_mode=WAL')

db.run(`CREATE TABLE IF NOT EXISTS pets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, species TEXT NOT NULL, breed TEXT, age INTEGER,
  price REAL NOT NULL, description TEXT, image_url TEXT, status TEXT DEFAULT 'available',
  created_at TEXT DEFAULT (datetime('now'))
)`)
db.run(`CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL, customer_email TEXT NOT NULL,
  address TEXT, total REAL, status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
)`)
db.run(`CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL, pet_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1, price REAL NOT NULL
)`)

const c = (db.query('SELECT count(*) as c FROM pets').get() as any).c
if (c === 0) {
  const pets = [
    ['Buddy', 'dog', 'Golden Retriever', 2, 1200, 'Friendly and energetic family dog', 'https://images.dog.ceo/breeds/retriever-golden/n02099601_100.jpg'],
    ['Luna', 'cat', 'Siamese', 1, 800, 'Playful and affectionate kitten', 'https://cdn2.thecatapi.com/images/MTYzNzQ.jpg'],
    ['Max', 'dog', 'German Shepherd', 3, 1500, 'Loyal and intelligent working dog', 'https://images.dog.ceo/breeds/shepherd-german/n02106662_100.jpg'],
    ['Coco', 'bird', 'Cockatiel', 1, 350, 'Talking bird, loves to whistle', ''],
    ['Milo', 'cat', 'Persian', 2, 900, 'Calm and gentle lap cat', 'https://cdn2.thecatapi.com/images/8ci.jpg'],
    ['Rocky', 'dog', 'Beagle', 4, 1000, 'Great with kids, loves walks', 'https://images.dog.ceo/breeds/beagle/n02088364_100.jpg'],
    ['Oreo', 'rabbit', 'Holland Lop', 1, 250, 'Soft and cuddly bunny', ''],
    ['Charlie', 'bird', 'Budgie', 1, 150, 'Colorful and easy to care for', ''],
    ['Daisy', 'dog', 'Poodle', 2, 1800, 'Hypoallergenic, very smart', 'https://images.dog.ceo/breeds/poodle-toy/n02113624_100.jpg'],
    ['Simba', 'cat', 'Maine Coon', 3, 1100, 'Large, friendly, dog-like cat', 'https://cdn2.thecatapi.com/images/MTgyNzc.jpg'],
  ]
  for (const p of pets) {
    db.run('INSERT INTO pets (name, species, breed, age, price, description, image_url) VALUES (?,?,?,?,?,?,?)', p[0], p[1], p[2], p[3], p[4], p[5], p[6])
  }
  console.log('[seed] 10 pets created')
} else console.log(`[seed] ${c} pets already exist`)
console.log('[seed] done')
