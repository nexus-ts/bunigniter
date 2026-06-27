/**
 * REPL — Interactive console for NexusTS.
 *
 * Usage: `bun run nx repl`
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
 */
import { readFileSync, existsSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { Elysia } from 'elysia'

const HISTORY_FILE = join(process.cwd(), '.nexus_repl_history')
const HISTORY_MAX = 100

/**
 * Start the REPL.
 */
export async function startRepl() {
	console.log('\n  ╔══════════════════════════════════════════╗')
	console.log('  ║        NexusTS Interactive Console        ║')
	console.log('  ║    Type .help for available commands      ║')
	console.log('  ╚══════════════════════════════════════════╝\n')

	// Try to load app config and initialize services
	const context = await initializeContext()

	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: 'nexus> ',
	})

	// Load history
	const history: string[] = []
	try {
		if (existsSync(HISTORY_FILE)) {
			const lines = readFileSync(HISTORY_FILE, 'utf-8').split('\n').filter(Boolean)
			history.push(...lines.slice(-HISTORY_MAX))
		}
	} catch {}

	// Track history index for up/down navigation
	let historyIndex = history.length

	// Override history navigation
	const originalWrite = process.stdout.write.bind(process.stdout)

	rl.on('line', async (input: string) => {
		const trimmed = input.trim()

		if (!trimmed) {
			rl.prompt()
			return
		}

		// Handle commands
		if (trimmed.startsWith('.')) {
			await handleCommand(trimmed, context, rl)
			rl.prompt()
			return
		}

		// Save to history
		history.push(trimmed)
		historyIndex = history.length
		try {
			appendFileSync(HISTORY_FILE, trimmed + '\n')
		} catch {}

		// Evaluate the expression
		try {
			const result = await evaluateExpression(trimmed, context)
			if (result !== undefined) {
				const output = typeof result === 'object'
					? inspect(result)
					: String(result)
				console.log(`  ${output}`)
			}
		} catch (err: any) {
			console.error(`  \x1b[31m${err.message ?? err}\x1b[0m`)
		}

		rl.prompt()
	})

	// Handle multiline input
	let multilineBuffer = ''
	let inMultiline = false

	rl.on('SIGINT', () => {
		if (inMultiline) {
			// Try to evaluate multiline buffer
			rl.write('')
			inMultiline = false
			multilineBuffer = ''
			rl.prompt()
		} else {
			console.log('\n  Bye!')
			process.exit(0)
		}
	})

	process.stdin.on('keypress', (_key: any, data: any) => {
		// Up arrow — history back
		if (data?.name === 'up') {
			if (historyIndex > 0) {
				historyIndex--
				clearLine(rl)
				rl.write(history[historyIndex] ?? '')
			}
		}
		// Down arrow — history forward
		if (data?.name === 'down') {
			if (historyIndex < history.length - 1) {
				historyIndex++
				clearLine(rl)
				rl.write(history[historyIndex] ?? '')
			} else {
				historyIndex = history.length
				clearLine(rl)
			}
		}
	})

	rl.prompt()
}

/** Clear the current line. */
function clearLine(rl: any) {
	readline.clearLine(process.stdout, 0)
	readline.cursorTo(process.stdout, 0)
}

function readline(rl: any) { return rl }

/** Initialize the REPL context with available services. */
async function initializeContext(): Promise<Record<string, any>> {
	const ctx: Record<string, any> = {
		// Utilities
		process,
		console,
		Date,
		Math,
		JSON,
		setTimeout,
		setInterval,
		crypto,
		Buffer,

		// REPL metadata
		__version: '0.1.0',
		__runtime: typeof Bun !== 'undefined' ? 'Bun' : 'Node.js',
	}

	// Try to load Drizzle DB
	try {
		const { DbClient } = await import('../db/drizzle')
		const dbConfig = loadDbConfig()
		if (dbConfig) {
			const db = new DbClient(dbConfig)
			await db.open()
			ctx.db = db
			ctx.query = (sql: string, params?: any[]) => db.query(sql, params)
			ctx.first = (sql: string, params?: any[]) => db.first(sql, params)
			console.log('  [db] connected')
		}
	} catch {}

	// Try to load Cache
	try {
		const { createCache } = await import('../helpers/cache')
		ctx.cache = createCache()
		console.log('  [cache] ready')
	} catch {}

	// Try to load HTTP client
	try {
		const { createHttp } = await import('../helpers/http')
		ctx.http = createHttp()
		console.log('  [http] ready')
	} catch {}

	return ctx
}

/** Try to load DB config from the app config. */
function loadDbConfig(): any {
	try {
		const configPath = join(process.cwd(), 'config/app.ts')
		if (existsSync(configPath)) {
			const content = readFileSync(configPath, 'utf-8')
			const dialectMatch = content.match(/dialect:\s*env\([^)]+\)\s*[/][/]\s*['"]([^'"]+)['"]/)
			const filenameMatch = content.match(/filename:\s*env\([^)]+\)\s*[/][/]\s*['"]([^'"]+)['"]/)

			if (dialectMatch || filenameMatch) {
				const dialect = 'bun-sqlite'
				const filename = 'app.db'
				return { dialect, connection: { filename } }
			}

			// Direct config
			const directDialect = content.match(/dialect:\s*'([^']+)'/)
			const directFile = content.match(/filename:\s*'([^']+)'/)
			if (directDialect) {
				return {
					dialect: directDialect[1],
					connection: { filename: directFile?.[1] ?? 'app.db' },
				}
			}
		}
	} catch {}
	return null
}

/** Handle REPL commands. */
async function handleCommand(cmd: string, ctx: Record<string, any>, rl: any): Promise<void> {
	const args = cmd.split(/\s+/)
	const command = args[0].toLowerCase()

	switch (command) {
		case '.help':
			console.log(`
  Commands:
    .help        Show this help
    .exit        Exit the REPL
    .routes      List registered routes (if app is loaded)
    .services    List available services in context
    .env         Show environment variables
    .db          Show database status
    .clear       Clear screen
    .version     Show version info

  Available variables:
    db           Database client (query, first, all)
    cache        Cache service (get, set, delete)
    http         HTTP client (get, post)
    query()      Shortcut for db.query()
    first()      Shortcut for db.first()

  Examples:
    nexus> await query('SELECT * FROM users')
    nexus> await cache.get('my_key')
    nexus> 1 + 2
    nexus> { hello: 'world' }
`)
			break

		case '.exit':
		case '.quit':
			console.log('  Bye!')
			process.exit(0)
			break

		case '.routes':
			console.log('  Routes: (run the app first)')
			break

		case '.services':
			console.log(`\n  Available services:\n`)
			for (const [key, val] of Object.entries(ctx)) {
				if (key.startsWith('__')) continue
				const type = typeof val
				const typeName = type === 'function' ? val.name || 'Function' :
					type === 'object' ? (val?.constructor?.name || 'Object') :
					type
				console.log(`    ${key.padEnd(15)} ${typeName}`)
			}
			console.log()
			break

		case '.env':
			const envVars = Object.keys(process.env).sort()
			console.log(`\n  Environment (${envVars.length} vars):\n`)
			for (const key of envVars.slice(0, 30)) {
				const val = process.env[key] ?? ''
				const display = val.length > 60 ? val.slice(0, 60) + '...' : val
				console.log(`    ${key.padEnd(25)} ${display}`)
			}
			if (envVars.length > 30) {
				console.log(`    ... and ${envVars.length - 30} more`)
			}
			console.log()
			break

		case '.db':
			if (ctx.db) {
				try {
					const result = await ctx.db.query('SELECT 1 as ok')
					console.log(`\n  Database: connected`)
					console.log(`  Dialect:  ${ctx.db.dialectName ?? 'unknown'}\n`)
				} catch (e: any) {
					console.log(`\n  Database: error — ${e.message}\n`)
				}
			} else {
				console.log('  No database connection.')
			}
			break

		case '.clear':
		case 'clear':
			console.clear()
			break

		case '.version':
			console.log(`  NexusTS REPL v0.1.0 (${ctx.__runtime})`)
			break

		default:
			console.log(`  Unknown command: ${command}. Type .help for available commands.`)
	}
}

/** Evaluate a JavaScript expression in context. */
async function evaluateExpression(input: string, ctx: Record<string, any>): Promise<any> {
	// Handle assignments
	if (input.includes('=') && !input.startsWith('==') && !input.startsWith('===')) {
		// Simple evaluation
		const fn = new Function(...Object.keys(ctx), `"use strict"; return (${input})`)
		return fn(...Object.values(ctx))
	}

	// Handle await expressions
	if (input.startsWith('await ') || input.includes(' await ')) {
		const fn = new Function(...Object.keys(ctx), `"use strict"; return (async () => { return ${input} })()`)
		return fn(...Object.values(ctx))
	}

	// Normal expression
	try {
		const fn = new Function(...Object.keys(ctx), `"use strict"; return (${input})`)
		return fn(...Object.values(ctx))
	} catch {
		// Try as statement
		try {
			const fn = new Function(...Object.keys(ctx), `"use strict"; ${input}`)
			return fn(...Object.values(ctx))
		} catch {
			// Try as async
			const fn = new Function(...Object.keys(ctx), `"use strict"; return (async () => { ${input} })()`)
			return fn(...Object.values(ctx))
		}
	}
}

/** Simple object inspector (like util.inspect). */
function inspect(obj: any, depth = 2, indent = 0): string {
	if (obj === null) return 'null'
	if (obj === undefined) return 'undefined'
	if (typeof obj !== 'object') return JSON.stringify(obj)

	if (depth <= 0) return Array.isArray(obj) ? `[Array(${obj.length})]` : `{${Object.keys(obj).join(', ')}}`

	const pad = '  '.repeat(indent)
	const childPad = '  '.repeat(indent + 1)

	if (Array.isArray(obj)) {
		if (obj.length === 0) return '[]'
		const items = obj.map((item: any) => `${childPad}${inspect(item, depth - 1, indent + 1)}`)
		return `[\n${items.join(',\n')}\n${pad}]`
	}

	const keys = Object.keys(obj)
	if (keys.length === 0) return '{}'

	const entries = keys.map((key) => {
		const val = obj[key]
		if (typeof val === 'function') return `${childPad}${key}: [Function: ${val.name || 'anonymous'}]`
		if (typeof val === 'object' && val !== null) {
			return `${childPad}${key}: ${inspect(val, depth - 1, indent + 1)}`
		}
		return `${childPad}${key}: ${JSON.stringify(val)}`
	})

	return `{\n${entries.join(',\n')}\n${pad}}`
}
