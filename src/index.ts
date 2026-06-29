/**
 * Bunigniter — Main Entry Point.
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

import { existsSync } from "node:fs"
import { join } from "node:path"
import { Elysia } from "elysia"
import { DbClient } from "./db/drizzle"
import { loadEnv } from "./helpers/env"
import type { MiddlewareConfig } from "./helpers/middleware"
import { applyMiddleware } from "./helpers/middleware"
import { authMiddleware, sessionMiddleware } from "./helpers/session-middleware"
import { registerFileRoutes } from "./router/file-router"
import { registerServerRoutes } from "./router/server-router"
import { setViewsDir } from "./view/renderer"

export { Controller, Service } from "./base/index"
export { DbClient, type DbConfig, type Dialect, type QueryResult } from "./db/drizzle"
export { defineHandler } from "./helpers/handler"
export { RequestProxy } from "./helpers/request"

interface AppConfig {
	port?: number | string
	host?: string
	db?: { dialect: string; connection: Record<string, any>; logging?: boolean }
	databases?: Record<string, { dialect: string; connection: Record<string, any>; logging?: boolean }>
	router?: { prefix?: string; directory?: string }
	view?: { directory?: string; scripts?: string[] }
	app?: { key?: string; debug?: boolean }
	middleware?: MiddlewareConfig
	services?: {
		cache?: false
		queue?: false
		mail?: false
		upload?: false
		ws?: false
		modules?: false
	}

	endpoints?: {
		health?: false // Health check endpoint (/health)
		openapi?: false // OpenAPI spec + Scalar UI (/docs)
	}
}

async function loadConfig(): Promise<AppConfig> {
	// Load .env files first
	loadEnv()
	try {
		const mod = await import(/* @vite-ignore */ join(process.cwd(), "config/app.ts"))
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
		app.decorate("db", db)
	}

	// Apply global middleware (CORS, Logger, CSRF, Rate Limit)
	applyMiddleware(app, config.middleware)

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

	// ─── Services (dynamic imports — tree-shakeable) ────────
	// Each service is only imported and initialized if not explicitly disabled
	// in config/app.ts via services: { cache: false, ... }

	const svc = config.services ?? {}

	// Cache
	const cache =
		svc.cache === false
			? undefined
			: await (async () => {
					const { createCache: fn } = await import("./services/cache")
					return fn()
				})()

	// Queue
	const queue =
		svc.queue === false
			? undefined
			: await (async () => {
					const { createQueue: fn } = await import("./services/queue")
					return fn()
				})()

	// Upload
	const upload =
		svc.upload === false
			? undefined
			: await (async () => {
					const { createUpload: fn } = await import("./services/upload")
					return fn()
				})()

	// Mail
	const mail =
		svc.mail === false
			? undefined
			: await (async () => {
					const { createMail: fn } = await import("./services/mail")
					return fn({
						transport: process.env.NODE_ENV === "production" ? undefined : undefined,
					})
				})()

	// ─── File-based Routes ────────────────────────────────────
	const routerPrefix = config.router?.prefix ?? "/api"
	const pagesDir = config.router?.directory ?? "routes"

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
	const publicDir = join(process.cwd(), "public")
	if (existsSync(publicDir)) {
		const { readFileSync } = await import("node:fs")
		app.get("/public/:file", async (ctx: any) => {
			const file = ctx.params?.file
			if (!file || file.includes("..")) return new Response("Not Found", { status: 404 })
			try {
				const content = readFileSync(join(publicDir, file))
				const ext = file.split(".").pop()
				const types: Record<string, string> = {
					js: "application/javascript",
					css: "text/css",
					html: "text/html",
					png: "image/png",
					svg: "image/svg+xml",
				}
				return new Response(content, {
					headers: { "content-type": types[ext] ?? "application/octet-stream" },
				})
			} catch {
				return new Response("Not Found", { status: 404 })
			}
		})
	}

	// ─── HMVC Modules ──────────────────────────────────────────
	if (svc.modules !== false) {
		const { registerModules: fn } = await import("./helpers/modules")
		await fn(app, { db, dbs: namedDbs, cache, queue, upload, mail })
	}

	// ─── WebSocket ───────────────────────────────────────────────
	if (svc.ws !== false) {
		const { ws: wss } = await import("./services/ws")
		wss.mount(app)
	}

	// ─── Server Routes (Void-style) ───────────────────────────
	const routesDir = "routes"
	if (existsSync(routesDir)) {
		await registerServerRoutes(app, routesDir, "")
	}

	// ─── OpenAPI Documentation (disabled via endpoints.openapi = false) ──
	if (config.endpoints?.openapi !== false) {
		const { openapi: openapiFn } = await import("./helpers/openapi")
		openapiFn(app, { title: "Bunigniter API", version: "0.1.0" })
	}

	// ─── Health Check (disabled via endpoints.health = false) ──────
	if (config.endpoints?.health !== false) {
		app.get(
			"/health",
			() =>
				new Response(
					JSON.stringify({
						status: "ok",
						uptime: process.uptime(),
						timestamp: new Date().toISOString(),
					}),
					{
						headers: { "content-type": "application/json" },
					},
				),
		)
	}

	// ─── Start Server ─────────────────────────────────────────
	app.listen(port, () => {
		console.log(`\n  🚀 Bunigniter ready at http://localhost:${port}`)
		console.log(`  📁 Routes:   ./${pagesDir}/`)
		console.log(`  🔗 Routes:   ${routerPrefix}/*`)
		console.log(`  💾 Database: ${dbConfig?.dialect ?? "none"}\n`)
	})
}

main().catch((err) => {
	console.error("[nexus] failed to start:", err)
	process.exit(1)
})
