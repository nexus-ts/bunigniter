/**
 * NexusTS — Main Entry Point.
 *
 * Bun-native fullstack framework inspired by CodeIgniter.
 * Built on Elysia v2 + Drizzle ORM.
 *
 * Usage:
 * ```bash
 * bun run src/index.ts
 * ```
 *
 * Or with hot reload:
 * ```bash
 * bun --hot run src/index.ts
 * ```
 */
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { Elysia } from 'elysia'
import { DbClient } from './db/drizzle'
import { registerFileRoutes } from './router/file-router'
import { registerServerRoutes } from './router/server-router'
import { loadEnv } from './helpers/env'
import { DbClient } from './db/drizzle'
import { sessionMiddleware, authMiddleware } from './helpers/session-middleware'
import { applyMiddleware } from './helpers/middleware'
import type { MiddlewareConfig } from './helpers/middleware'
import { loadMiddleware, applyMiddlewareToApp } from './helpers/middleware-loader'
import { setViewsDir } from './view/renderer'
import { openapi } from './helpers/openapi'
import { createCache, Cache } from './helpers/cache'
import { createQueue, Queue } from './helpers/queue'
import { createUpload, Upload } from './helpers/upload'
import { createMail, Mail } from './helpers/mail'

export { Controller, Service } from './base/index'
export { DbClient } from './db/drizzle'

interface AppConfig {
	port?: number | string
	host?: string
	db?: { dialect: string; connection: Record<string, any>; logging?: boolean }
	databases?: Record<string, { dialect: string; connection: Record<string, any>; logging?: boolean }>
	router?: { prefix?: string; directory?: string }
	view?: { directory?: string; scripts?: string[] }
	app?: { key?: string; debug?: boolean }
	middleware?: MiddlewareConfig
}

async function loadConfig(): Promise<AppConfig> {
	// Load .env files first
	loadEnv()
	try {
		const mod = await import(/* @vite-ignore */ join(process.cwd(), 'config/app.ts'))
		return (mod as any).default ?? {}
	} catch {
		return {}
	}
}

/**
 * Create and start the application.
 */
async function main() {
	const config: AppConfig = await loadConfig()
	const port = Number(config.port ?? 3000)
	const dbConfig = config.db

	// ─── Database ─────────────────────────────────────────────
	let db: DbClient | undefined

	if (dbConfig) {
		db = new DbClient(dbConfig)
		await db.open()
		console.log(`[db] connected: ${dbConfig.dialect}`)
	}

	// ─── Elysia App ────────────────────────────────────────────
	const app = new Elysia()

	// Make db available in Elysia context
	if (db) {
		app.decorate('db', db)
	}

	// Apply global middleware (CORS, Logger, CSRF, Rate Limit)
	applyMiddleware(app, config.middleware)

	// Load Void-style middleware/ directory
	const mwDir = 'middleware'
	if (existsSync(mwDir)) {
		const middlewareFns = await loadMiddleware(mwDir)
		applyMiddlewareToApp(app, middlewareFns)
	}

	// Global middleware: Session + Auth
	app.use(sessionMiddleware({ key: config.app?.key }))
	app.use(authMiddleware())


	// ─── View Engine ───────────────────────────────────────────
	if (config.view?.directory) {
		setViewsDir(config.view.directory)
	}

	// ─── Named Databases ───────────────────────────────────────
	const namedDbs: Record<string, DbClient> = {}
	if (config.databases) {
		for (const [name, dbConfig] of Object.entries(config.databases)) {
			try {
				const namedDb = new DbClient(dbConfig)
				await namedDb.open()
				namedDbs[name] = namedDb
				console.log(`[db] ${name}: ${dbConfig.dialect}`)
			} catch (e: any) {
				console.error(`[db] ${name}: failed - ${e.message}`)
			}
		}
	}

	// ─── Services (Cache, Queue, Upload, Mail) ─────────────────
	const cache = createCache()
	const queue = createQueue()
	const upload = createUpload()
	const mail = createMail({
		transport: process.env.NODE_ENV === 'production'
			? undefined // SMTP in production
			: undefined, // Null in dev (set via env)
	})

	// ─── File-based Routes ────────────────────────────────────
	const routerPrefix = config.router?.prefix ?? '/api'
	const pagesDir = config.router?.directory ?? 'routes'

	await registerFileRoutes(app, {
		directory: pagesDir,
		prefix: routerPrefix,
		db,
		dbs: namedDbs,
		cache,
		queue,
		upload,
		mail,
	})

	// ─── Static Files ────────────────────────────────────────
	const publicDir = join(process.cwd(), 'public')
	if (existsSync(publicDir)) {
		const { readFileSync } = await import('node:fs')
		app.get('/public/:file', async (ctx: any) => {
			const file = ctx.params?.file
			if (!file || file.includes('..')) return new Response('Not Found', { status: 404 })
			try {
				const content = readFileSync(join(publicDir, file))
				const ext = file.split('.').pop()
				const types: Record<string, string> = { js: 'application/javascript', css: 'text/css', html: 'text/html', png: 'image/png', svg: 'image/svg+xml' }
				return new Response(content, { headers: { 'content-type': types[ext] ?? 'application/octet-stream' } })
			} catch {
				return new Response('Not Found', { status: 404 })
			}
		})
	}

	// ─── Server Routes (Void-style) ───────────────────────────
	const routesDir = 'routes'
	if (existsSync(routesDir)) {
		await registerServerRoutes(app, routesDir, '')
	}

	// ─── OpenAPI Documentation ───────────────────────────────
	openapi(app, {
		title: 'NexusTS API',
		version: '0.1.0',
	})

	// ─── Health Check ─────────────────────────────────────────
	app.get('/health', () => new Response(JSON.stringify({
		status: 'ok',
		uptime: process.uptime(),
		timestamp: new Date().toISOString()
	}), {
		headers: { 'content-type': 'application/json' }
	}))

	// ─── Start Server ─────────────────────────────────────────
	app.listen(port, () => {
		console.log(`\n  🚀 NexusTS ready at http://localhost:${port}`)
		console.log(`  📁 Routes:   ./${pagesDir}/`)
		console.log(`  🔗 Routes:   ${routerPrefix}/*`)
		console.log(`  💾 Database: ${dbConfig?.dialect ?? 'none'}\n`)
	})
}

main().catch((err) => {
	console.error('[nexus] failed to start:', err)
	process.exit(1)
})
