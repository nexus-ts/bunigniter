/**
 * Bunigniter CLI — scaffolding and utility commands.
 *
 * Usage: `bun run bi <command> [args]`
 *
 * All templates live in src/cli/templates.ts — single source of truth.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const CWD = process.cwd()
const ROUTES_DIR = join(CWD, "routes")
const DB_DIR = join(CWD, "db")
const MIGRATIONS_DIR = join(CWD, "db/migrations")
const SEEDS_DIR = join(CWD, "db/seeds")
const MIDDLEWARE_DIR = join(CWD, "middleware")
const TESTS_DIR = join(CWD, "tests")

// ─── Command registry ──────────────────────────────────────────

const commands: Record<string, { desc: string; run: (args: string[]) => Promise<void> }> = {}

export function register(name: string, desc: string, fn: (args: string[]) => Promise<void>): void {
	commands[name] = { desc, run: fn }
}

// ─── Shared helpers ────────────────────────────────────────────

function ensureDir(dir: string): void {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function write(_name: string, filePath: string, content: string): void {
	ensureDir(filePath.substring(0, filePath.lastIndexOf("/")))
	if (existsSync(filePath)) throw new Error(`Already exists: ${filePath}`)
	writeFileSync(filePath, content, "utf-8")
	console.log(`[nx] Created: ${filePath}`)
}

function argValue(args: string[], key: string, fallback = ""): string {
	const idx = args.indexOf(key)
	if (idx >= 0 && idx + 1 < args.length) return args[idx + 1]
	const eq = args.find((a) => a.startsWith(`${key}=`))
	if (eq) return eq.split("=").slice(1).join("=")
	return fallback
}

// ─── Register commands ─────────────────────────────────────────

register("make:controller", "Scaffold a route controller", async (args) => {
	const name = args[0]
	if (!name) throw new Error("Usage: bi make:controller <name>")
	const { controller } = await import("./templates")
	write(name, join(ROUTES_DIR, `${name}.ts`), controller(name, process.env.ROUTER_PREFIX || "/api"))
})

register("make:model", "Create DB schema", async (args) => {
	const name = args[0]
	if (!name) throw new Error('Usage: bi make:model <name> --columns "name:string,email:string"')
	const cols = argValue(args, "--columns", "name:string")
	const { model } = await import("./templates")
	const schemaDir = join(DB_DIR, "schema")
	write(name, join(schemaDir, `${name}.ts`), model(name, cols))
})

register("make:migration", "Create a migration file", async (args) => {
	const name = args[0]
	if (!name) throw new Error("Usage: bi make:migration <name>")
	const { migration } = await import("./templates")
	write(name, join(MIGRATIONS_DIR, `${Date.now()}_${name}.sql`), migration(name))
})

register("db:migrate", "Run pending migrations", async () => {
	ensureDir(MIGRATIONS_DIR)
	const files = readdirSync(MIGRATIONS_DIR)
		.filter((f) => f.endsWith(".sql"))
		.sort()
	if (files.length === 0) {
		console.log("[nx] No pending migrations.")
		return
	}
	for (const file of files) {
		const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8")
		console.log(`[nx] Running: ${file}`)
		// Execute SQL via bun:sqlite
		try {
			const { Database } = await import("bun:sqlite")
			const dbPath = arg(["DB_FILENAME"], "app.db")
			const db = new Database(dbPath)
			for (const stmt of sql.split(";").filter(Boolean)) {
				db.run(stmt.trim())
			}
			db.close()
			console.log(`[nx]   ✓ ${file}`)
		} catch (e: any) {
			console.error(`[nx]   ✗ ${e.message}`)
		}
	}
})

register("db:rollback", "Rollback last migration", async () => {
	ensureDir(MIGRATIONS_DIR)
	const files = readdirSync(MIGRATIONS_DIR)
		.filter((f) => f.endsWith(".sql"))
		.sort()
	if (files.length === 0) {
		console.log("[nx] No migrations to rollback.")
		return
	}
	const last = files[files.length - 1]
	try {
		const fs = await import("node:fs")
		fs.unlinkSync(join(MIGRATIONS_DIR, last))
		console.log(`[nx] Rolled back: ${last}`)
	} catch (e: any) {
		console.error(`[nx] Error: ${e.message}`)
	}
})

register("db:seed", "Run database seeders", async (args) => {
	const specific = argValue(args, "--file", "")
	const dir = specific ? join(SEEDS_DIR, specific) : SEEDS_DIR
	if (!existsSync(dir)) {
		console.log("[nx] No seeders directory found.")
		return
	}
	if (specific && !existsSync(dir)) throw new Error(`Seeder not found: ${specific}`)

	const files = specific
		? [specific]
		: readdirSync(SEEDS_DIR)
				.filter((f) => f.endsWith(".ts"))
				.sort()
	for (const file of files) {
		const mod = await import(join(SEEDS_DIR, file))
		const fn = mod.default || mod.seed
		if (typeof fn === "function") {
			console.log(`[nx] Seeding: ${file}`)
			await fn({ db: null, dialect: "sqlite" })
		}
	}
})

register("make:seeder", "Scaffold a seeder file", async (args) => {
	const name = args[0]
	if (!name) throw new Error("Usage: bi make:seeder <name>")
	const { seeder } = await import("./templates")
	write(name, join(SEEDS_DIR, `${name}.ts`), seeder(name))
})

register("db:wipe", "Drop all tables (DESTRUCTIVE)", async () => {
	console.log("[nx] WARNING: This will drop ALL tables!")
	try {
		const { Database } = await import("bun:sqlite")
		const dbPath = arg(["DB_FILENAME"], "app.db")
		const db = new Database(dbPath)
		const tables = db.query("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]
		for (const t of tables) {
			if (t.name === "sqlite_sequence") continue
			db.run(`DROP TABLE IF EXISTS "${t.name}"`)
			console.log(`[nx]   Dropped: ${t.name}`)
		}
		db.close()
		console.log(`[nx] Done. ${tables.length - 1} tables dropped.`)
	} catch (e: any) {
		console.error(`[nx] Error: ${e.message}`)
	}
})

register("key:generate", "Generate APP_KEY", async () => {
	const key = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64")
	console.log(`\n  APP_KEY=${key}\n`)
	console.log("  Add to your .env file:")
	console.log(`  APP_KEY=${key}\n`)
})

register("make:middleware", "Scaffold a middleware", async (args) => {
	const name = args[0]
	if (!name) throw new Error("Usage: bi make:middleware <name>")
	const { middleware } = await import("./templates")
	write(name, join(MIDDLEWARE_DIR, `${name}.ts`), middleware(name))
})

register("make:test", "Scaffold a test file", async (args) => {
	const name = args[0]
	if (!name) throw new Error("Usage: bi make:test <name>")
	const { test } = await import("./templates")
	write(name, join(TESTS_DIR, `${name}.test.ts`), test(name))
})

register("make:command", "Scaffold a CLI command", async (args) => {
	const name = args[0]
	if (!name) throw new Error("Usage: bi make:command <name>")
	const { command } = await import("./templates")
	write(name, join(CWD, "commands", `${name}.ts`), command(name))
})

register("make:job", "Scaffold a queue job", async (args) => {
	const name = args[0]
	if (!name) throw new Error("Usage: bi make:job <name>")
	const { job } = await import("./templates")
	write(name, join(CWD, "jobs", `${name}.ts`), job(name))
})

register("make:mail", "Scaffold a mail class", async (args) => {
	const name = args[0]
	if (!name) throw new Error("Usage: bi make:mail <name>")
	const { mail } = await import("./templates")
	write(name, join(CWD, "mails", `${name}.ts`), mail(name))
})

register("make:event", "Scaffold an event class", async (args) => {
	const name = args[0]
	if (!name) throw new Error("Usage: bi make:event <name>")
	const { eventTemplate } = await import("./templates")
	write(name, join(CWD, "events", `${name}.ts`), eventTemplate(name))
})

register("make:listener", "Scaffold an event listener", async (args) => {
	const name = args[0]
	if (!name) throw new Error("Usage: bi make:listener <name>")
	const { listener } = await import("./templates")
	write(name, join(CWD, "listeners", `${name}.ts`), listener(name))
})

register("make:provider", "Scaffold a service provider", async (args) => {
	const name = args[0]
	if (!name) throw new Error("Usage: bi make:provider <name>")
	const { provider } = await import("./templates")
	write(name, join(CWD, "providers", `${name}.ts`), provider(name))
})

register("make:policy", "Scaffold an authorization policy", async (args) => {
	const name = args[0]
	if (!name) throw new Error("Usage: bi make:policy <name>")
	const { policy } = await import("./templates")
	write(name, join(CWD, "policies", `${name}.ts`), policy(name))
})

register("make:request", "Scaffold a form request (validation)", async (args) => {
	const name = args[0]
	if (!name) throw new Error("Usage: bi make:request <name>")
	const { formRequest } = await import("./templates")
	write(name, join(CWD, "requests", `${name}.ts`), formRequest(name))
})

register("make:resource", "Scaffold an API resource", async (args) => {
	const name = args[0]
	if (!name) throw new Error("Usage: bi make:resource <name>")
	const { resource } = await import("./templates")
	write(name, join(CWD, "resources", `${name}.ts`), resource(name))
})

register("make:rule", "Scaffold a validation rule", async (args) => {
	const name = args[0]
	if (!name) throw new Error("Usage: bi make:rule <name>")
	const { rule } = await import("./templates")
	write(name, join(CWD, "rules", `${name}.ts`), rule(name))
})

register("storage:link", "Create storage symlink", async () => {
	const target = join(CWD, "storage", "app")
	const link = join(CWD, "public", "storage")
	if (existsSync(link)) {
		console.log("[nx] Storage link already exists.")
		return
	}
	ensureDir(join(CWD, "storage"))
	ensureDir(join(CWD, "public"))
	try {
		const fs = await import("node:fs")
		fs.symlinkSync(target, link, "dir")
		console.log(`[nx] Linked: ${link} → ${target}`)
	} catch (e: any) {
		console.error(`[nx] Error: ${e.message}`)
	}
})

register("build:edge", "Build pre-compiled edge routes", async () => {
	const { buildEdgeRoutes } = await import("../edge-builder")
	await buildEdgeRoutes()
})

register("edge:dev", "Run edge app locally", async () => {
	const { createEdgeApp, register } = await import("../edge")
	const app = createEdgeApp()
	register(
		app,
		"GET",
		"/api/hello",
		() =>
			new Response(JSON.stringify({ message: "Hello from Edge!" }), {
				headers: { "content-type": "application/json" },
			}),
	)
	app.listen(3001, () => console.log("Edge app on :3001"))
})

register("list", "Show all registered routes", async () => {
	const { listRoutes } = await import("./list-routes")
	await listRoutes()
})

register("new", "Scaffold a new project in new directory", async (args) => {
	const { newProject } = await import("./scaffold")
	await newProject(args)
})

register("init", "Scaffold bunigniter into current directory (merges package.json)", async (args) => {
	const { initProject } = await import("./scaffold")
	await initProject(args)
})

register("repl", "Start interactive console", async () => {
	const { startRepl } = await import("./repl")
	await startRepl()
})

register("help", "Show this help", async () => {
	console.log("\n  Bunigniter CLI")
	console.log("  ─────────────────────────────────")
	for (const [name, cmd] of Object.entries(commands)) {
		console.log(`  ${name.padEnd(25)} ${cmd.desc}`)
	}
	console.log()
})

// ─── Boot ──────────────────────────────────────────────────────

async function main() {
	const args = process.argv.slice(2)
	const cmd = args[0]

	if (!cmd || cmd === "help" || !commands[cmd]) {
		await commands.help.run()
		process.exit(cmd && cmd !== "help" ? 1 : 0)
	}

	try {
		await commands[cmd].run(args.slice(1))
	} catch (err) {
		console.error(`[nx] Error: ${(err as Error).message}`)
		process.exit(1)
	}
}

main()

/** Read first matching env var or return default. */
function arg(keys: string[], fallback: string): string {
	for (const k of keys) {
		const v = process.env[k] ?? ""
		if (v) return v
	}
	return fallback
}
