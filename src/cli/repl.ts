/**
 * REPL — Interactive console for Bunigniter.
 *
 * Usage: `bun run bi repl`
 *
 * Provides access to db, cache, session, and app services.
 *
 * Commands:
 *   .help        Show help
 *   .exit        Exit REPL
 *   .routes      List registered routes
 *   .services    List available services
 *   .env         Show environment variables
 *   .db          Show database status
 *   .clear       Clear screen
 *   .version     Show version info
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { clearLine, createInterface, cursorTo } from "node:readline"
import { inspect } from "node:util"

const HISTORY_FILE = join(process.cwd(), ".bi_repl_history")
const HISTORY_MAX = 100
const PING_SQL = "SELECT 1 as ok"

/** Build a pretty ASCII box banner. */
function banner(version: string, runtime: string): string {
	const lines = [
		"",
		"  ╔══════════════════════════════════════════════════════╗",
		"  ║                                                      ║",
		"  ║              ◈  Bunigniter  ◈                      ║",
		"  ║        Interactive Development Console               ║",
		"  ║                                                      ║",
		`  ║    version  ${version.padEnd(25)}              ║`,
		`  ║    runtime  ${runtime.padEnd(25)}              ║`,
		"  ║                                                      ║",
		"  ║    Type .help for available commands                 ║",
		"  ║                                                      ║",
		"  ╚══════════════════════════════════════════════════════╝",
	]
	return lines.join("\n")
}

/** Read version from package.json. */
function readVersion(): string {
	try {
		const pkgPath = join(process.cwd(), "package.json")
		if (existsSync(pkgPath)) {
			const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
			return pkg.version ?? "0.0.0"
		}
	} catch {
		// ignore
	}
	return "0.0.0"
}

/**
 * Start the REPL.
 */
export async function startRepl() {
	const version = readVersion()
	const runtime = typeof Bun !== "undefined" ? `Bun ${Bun.version}` : "Node.js"

	console.log(banner(version, runtime))
	console.log("")

	const context = await initializeContext(version, runtime)

	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: "\x1b[36mnexus> \x1b[0m",
	})

	// Load history
	const history: string[] = []
	try {
		if (existsSync(HISTORY_FILE)) {
			const lines = readFileSync(HISTORY_FILE, "utf-8").split("\n").filter(Boolean)
			history.push(...lines.slice(-HISTORY_MAX))
		}
	} catch {
		// ignore
	}

	let historyIndex = history.length

	rl.on("line", async (input: string) => {
		const trimmed = input.trim()

		if (!trimmed) {
			rl.prompt()
			return
		}

		// Handle REPL commands
		if (trimmed.startsWith(".")) {
			await handleCommand(trimmed, context)
			rl.prompt()
			return
		}

		// Save to history
		history.push(trimmed)
		historyIndex = history.length
		try {
			appendFileSync(HISTORY_FILE, `${trimmed}\n`)
		} catch {
			// ignore
		}

		// Trim history
		if (history.length > HISTORY_MAX) {
			history.splice(0, history.length - HISTORY_MAX)
		}

		// Evaluate the expression
		try {
			const result = await evaluateExpression(trimmed, context)
			if (result !== undefined) {
				const output =
					typeof result === "object" && result !== null
						? inspect(result, { depth: 3, colors: true, sorted: true })
						: typeof result === "string"
							? `\x1b[33m"${result}"\x1b[0m`
							: String(result)
				console.log(`  \x1b[90m=>\x1b[0m ${output}`)
			}
		} catch (err: any) {
			console.error(`  \x1b[31m✗ ${err.message ?? err}\x1b[0m`)
		}

		rl.prompt()
	})

	rl.on("SIGINT", () => {
		console.log("\n  \x1b[90mBye!\x1b[0m")
		process.exit(0)
	})

	// Keypress handling for history navigation and tab completion
	const stdin = process.stdin
	if (stdin.isTTY) {
		stdin.on("data", (key: Buffer) => {
			// Up arrow
			if (key[0] === 0x1b && key[1] === 0x5b && key[2] === 0x41) {
				if (historyIndex > 0) {
					historyIndex--
					clearLine(process.stdout, 0)
					cursorTo(process.stdout, 0)
					rl.write(history[historyIndex] ?? "")
				}
			}
			// Down arrow
			if (key[0] === 0x1b && key[1] === 0x5b && key[2] === 0x42) {
				if (historyIndex < history.length - 1) {
					historyIndex++
					clearLine(process.stdout, 0)
					cursorTo(process.stdout, 0)
					rl.write(history[historyIndex] ?? "")
				} else {
					historyIndex = history.length
					clearLine(process.stdout, 0)
					cursorTo(process.stdout, 0)
				}
			}
			// Tab completion
			if (key[0] === 0x09) {
				const line = rl.line
				const matches = Object.keys(context).filter((k) => k.startsWith(line) && !k.startsWith("__"))
				if (matches.length === 1) {
					clearLine(process.stdout, 0)
					cursorTo(process.stdout, 0)
					rl.write(matches[0])
				} else if (matches.length > 1) {
					console.log(`\n  ${matches.join(", ")}`)
					rl.prompt()
					rl.write(line)
				}
			}
		})
	}

	rl.prompt()
}

/** Initialize the REPL context with available services. */
async function initializeContext(version: string, runtime: string): Promise<Record<string, any>> {
	const ctx: Record<string, any> = {
		process,
		console,
		Date,
		Math,
		JSON,
		setTimeout,
		setInterval,
		clearTimeout,
		clearInterval,
		crypto,
		Buffer,
		URL,
		parseInt,
		parseFloat,
		__version: version,
		__runtime: runtime,
	}

	// Try to load Drizzle DB
	try {
		const { DbClient } = await import("../db/drizzle")
		const dbConfig = loadDbConfig()
		if (dbConfig) {
			const db = new DbClient(dbConfig)
			await db.open()
			ctx.db = db
			ctx.query = (sql: string, params?: any[]) => db.query(sql, params)
			ctx.first = (sql: string, params?: any[]) => db.first(sql, params)
			console.log("  \x1b[32m◈\x1b[0m \x1b[90mdb\x1b[0m  connected")
		}
	} catch {
		console.log("  \x1b[33m◈\x1b[0m \x1b[90mdb\x1b[0m  not loaded")
	}

	// Try to load Cache
	try {
		const { createCache } = await import("../helpers/cache")
		ctx.cache = createCache()
		console.log("  \x1b[32m◈\x1b[0m \x1b[90mcache\x1b[0m  ready")
	} catch {
		console.log("  \x1b[33m◈\x1b[0m \x1b[90mcache\x1b[0m  not available")
	}

	// Try to load HTTP client
	try {
		const { createHttp } = await import("../helpers/http")
		ctx.http = createHttp()
		console.log("  \x1b[32m◈\x1b[0m \x1b[90mhttp\x1b[0m  ready")
	} catch {
		console.log("  \x1b[33m◈\x1b[0m \x1b[90mhttp\x1b[0m  not available")
	}

	return ctx
}

/** Try to load DB config from the app config. */
function loadDbConfig(): any {
	try {
		const configPath = join(process.cwd(), "config/app.ts")
		if (existsSync(configPath)) {
			const content = readFileSync(configPath, "utf-8")

			const dialectMatch = content.match(/dialect:\s*'([^']+)'/)
			const fileMatch = content.match(/filename:\s*'([^']+)'/)
			if (dialectMatch) {
				return {
					dialect: dialectMatch[1],
					connection: { filename: fileMatch?.[1] ?? "app.db" },
				}
			}
		}
	} catch {
		// ignore
	}
	return null
}

/** Describe a service entry for the .services command. */
function describeService(val: unknown): string {
	const type = typeof val
	if (type === "function") {
		return `\x1b[33mfn\x1b[0m  ${(val as Function).name || "(anonymous)"}()`
	}
	if (type === "object" && val !== null) {
		return `\x1b[35mobj\x1b[0m  ${(val as object).constructor?.name || "Object"}`
	}
	return `\x1b[34m${type}\x1b[0m`
}

/** Truncate an env value for display. */
function truncateEnvVal(val: string): string {
	return val.length > 60 ? `${val.slice(0, 60)}\x1b[90m...\x1b[0m` : val
}

/** Handle REPL commands. */
async function handleCommand(cmd: string, ctx: Record<string, any>): Promise<void> {
	const args = cmd.split(/\s+/)
	const command = args[0].toLowerCase()

	switch (command) {
		case ".help": {
			console.log(`
  \x1b[36m── Commands ──────────────────────────────────────\x1b[0m
    \x1b[33m.help\x1b[0m        Show this help
    \x1b[33m.exit\x1b[0m        Exit the REPL
    \x1b[33m.quit\x1b[0m        Exit the REPL
    \x1b[33m.routes\x1b[0m      List registered routes
    \x1b[33m.services\x1b[0m    List available services in context
    \x1b[33m.env\x1b[0m         Show environment variables
    \x1b[33m.db\x1b[0m          Show database status
    \x1b[33m.clear\x1b[0m       Clear screen
    \x1b[33m.version\x1b[0m     Show version info

  \x1b[36m── Available Variables ────────────────────────────\x1b[0m
    \x1b[33mdb\x1b[0m           Database client (query, first, all)
    \x1b[33mcache\x1b[0m        Cache service (get, set, delete)
    \x1b[33mhttp\x1b[0m         HTTP client (get, post)
    \x1b[33mquery()\x1b[0m      Shortcut for db.query()
    \x1b[33mfirst()\x1b[0m      Shortcut for db.first()

  \x1b[36m── Examples ──────────────────────────────────────\x1b[0m
    \x1b[90mnexus>\x1b[0m await query('SELECT * FROM users')
    \x1b[90mnexus>\x1b[0m await cache.get('my_key')
    \x1b[90mnexus>\x1b[0m 1 + 2
    \x1b[90mnexus>\x1b[0m const x = 42; x * 2
    \x1b[90mnexus>\x1b[0m { hello: 'world' }
`)
			break
		}

		case ".exit":
		case ".quit": {
			console.log("  \x1b[90mBye!\x1b[0m")
			process.exit(0)
			break
		}

		case ".routes":
		case ".list": {
			const { listRoutes } = await import("./list-routes")
			await listRoutes()
			break
		}

		case ".services": {
			console.log(`\n  \x1b[36mAvailable services:\x1b[0m\n`)
			for (const [key, val] of Object.entries(ctx)) {
				if (key.startsWith("__")) continue
				console.log(`    \x1b[32m${key}\x1b[0m  ${describeService(val)}`)
			}
			console.log()
			break
		}

		case ".env": {
			const envVars = Object.keys(process.env).sort()
			console.log(`\n  \x1b[36mEnvironment (\x1b[33m${envVars.length}\x1b[36m vars):\x1b[0m\n`)
			for (const key of envVars.slice(0, 30)) {
				console.log(`    \x1b[32m${key.padEnd(25)}\x1b[0m ${truncateEnvVal(process.env[key] ?? "")}`)
			}
			if (envVars.length > 30) {
				console.log(`    \x1b[90m... and ${envVars.length - 30} more\x1b[0m`)
			}
			console.log()
			break
		}

		case ".db": {
			if (ctx.db) {
				try {
					await ctx.db.query(PING_SQL)
					console.log(`\n  \x1b[32m◈\x1b[0m Database: \x1b[32mconnected\x1b[0m`)
					console.log(`  \x1b[32m◈\x1b[0m Dialect:  ${ctx.db.dialectName ?? "unknown"}\n`)
				} catch (e: any) {
					console.log(`\n  \x1b[31m◈\x1b[0m Database: \x1b[31merror\x1b[0m — ${e.message}\n`)
				}
			} else {
				console.log("\n  \x1b[33m◈\x1b[0m No database connection.\n")
			}
			break
		}

		case ".clear":
		case "clear": {
			console.clear()
			console.log(banner(ctx.__version, ctx.__runtime))
			console.log("")
			break
		}

		case ".version": {
			console.log(`
  \x1b[36mBunigniter\x1b[0m  \x1b[33mv${ctx.__version}\x1b[0m
  \x1b[36mRuntime\x1b[0m  ${ctx.__runtime}
`)
			break
		}

		default: {
			console.log(`  \x1b[31mUnknown command:\x1b[0m ${command}. Type \x1b[33m.help\x1b[0m for available commands.`)
		}
	}
}

/** Evaluate a JavaScript expression in context. */
async function evaluateExpression(input: string, ctx: Record<string, any>): Promise<any> {
	const hasAwait = input.includes("await ")
	const keys = Object.keys(ctx)
	const values = Object.values(ctx)

	// Try as expression first (fast path)
	try {
		const fn = new Function(...keys, `"use strict"; return (${input})`)
		return fn(...values)
	} catch {
		// try fallthrough
	}

	// Try as async expression (handles top-level await)
	try {
		const fn = new Function(...keys, `"use strict"; return (async () => { ${hasAwait ? "" : "return "}${input} })()`)
		return fn(...values)
	} catch {
		// try fallthrough
	}

	// Try as statement
	try {
		const fn = new Function(...keys, `"use strict"; ${input}`)
		return fn(...values)
	} catch {
		// try fallthrough
	}

	// Last resort — async statement
	const fn = new Function(...keys, `"use strict"; return (async () => { ${input} })()`)
	return fn(...values)
}
