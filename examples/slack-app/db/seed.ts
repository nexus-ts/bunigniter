import { Database } from "bun:sqlite";
import { join } from "node:path";
import crypto from "node:crypto";

const dbPath = join(import.meta.dirname, "slack.db");

// Remove old db
try {
	require("node:fs").unlinkSync(dbPath);
} catch {}

const db = new Database(dbPath);

// Enable WAL
db.run("PRAGMA journal_mode=WAL");

// Create tables
db.run("DROP TABLE IF EXISTS messages");
db.run("DROP TABLE IF EXISTS channel_members");
db.run("DROP TABLE IF EXISTS channels");
db.run("DROP TABLE IF EXISTS users");

db.run(`CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  avatar TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)`);

db.run(`CREATE TABLE channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  topic TEXT DEFAULT '',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
)`);

db.run(`CREATE TABLE channel_members (
  channel_id INTEGER REFERENCES channels(id),
  user_id INTEGER REFERENCES users(id),
  PRIMARY KEY (channel_id, user_id)
)`);

db.run(`CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER REFERENCES channels(id),
  user_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL DEFAULT '',
  file_path TEXT,
  file_type TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)`);

const hash = (pw: string) =>
	crypto.createHash("sha256").update(pw).digest("hex");

// Seed users
db.run(
	"INSERT INTO users (username, display_name, email, password) VALUES (?, ?, ?, ?)",
	["alice", "Alice", "alice@test.com", hash("password")],
);
db.run(
	"INSERT INTO users (username, display_name, email, password) VALUES (?, ?, ?, ?)",
	["bob", "Bob", "bob@test.com", hash("password")],
);
db.run(
	"INSERT INTO users (username, display_name, email, password) VALUES (?, ?, ?, ?)",
	["charlie", "Charlie", "charlie@test.com", hash("password")],
);

// Channels
db.run("INSERT INTO channels (name, topic, created_by) VALUES (?, ?, ?)", [
	"general",
	"Company announcements & work matters",
	1,
]);
db.run("INSERT INTO channels (name, topic, created_by) VALUES (?, ?, ?)", [
	"random",
	"Non-work banter",
	1,
]);
db.run("INSERT INTO channels (name, topic, created_by) VALUES (?, ?, ?)", [
	"engineering",
	"Code & architecture discussions",
	2,
]);

// Members
const members = [
	[1, 1],
	[1, 2],
	[1, 3],
	[2, 1],
	[2, 2],
	[3, 1],
	[3, 2],
];
for (const [c, u] of members) {
	db.run("INSERT INTO channel_members (channel_id, user_id) VALUES (?, ?)", [
		c,
		u,
	]);
}

// Messages
db.run("INSERT INTO messages (channel_id, user_id, content) VALUES (?, ?, ?)", [
	1,
	1,
	"Welcome to #general! 👋",
]);
db.run("INSERT INTO messages (channel_id, user_id, content) VALUES (?, ?, ?)", [
	1,
	2,
	"Hey team! Great to be here.",
]);
db.run("INSERT INTO messages (channel_id, user_id, content) VALUES (?, ?, ?)", [
	2,
	3,
	"Anyone tried the new coffee machine? ☕",
]);
db.run("INSERT INTO messages (channel_id, user_id, content) VALUES (?, ?, ?)", [
	3,
	2,
	"Deploying v2.1 to production today.",
]);
db.run("INSERT INTO messages (channel_id, user_id, content) VALUES (?, ?, ?)", [
	3,
	1,
	"LGTM! Ship it 🚀",
]);

console.log("[seed] Slack app database seeded!");
process.exit(0);
