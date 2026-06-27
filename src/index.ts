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
import { Elysia } from 'elysia'
import { DbClient } from './db/drizzle'
import { registerFileRoutes } from './router/file-router'

export { Controller, Service } from './base/index'
export { DbClient } from './db/drizzle'

interface AppConfig {
	port?: number | string
	host?: string
	db?: { dialect: string; connection: Record<string, any>; logging?: boolean }
	router?: { prefix?: string; directory?: string }
}

async function loadConfig(): Promise<AppConfig> {
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
	const port = Number(config.port ?? process.env.PORT ?? 3000)
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

	// ─── File-based Routes ────────────────────────────────────
	const routerPrefix = config.router?.prefix ?? '/api'
	const pagesDir = config.router?.directory ?? 'pages'

	await registerFileRoutes(app, {
		directory: pagesDir,
		prefix: routerPrefix,
		db,
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
		console.log(`  📁 Pages:    ./${pagesDir}/`)
		console.log(`  🔗 Routes:   ${routerPrefix}/*`)
		console.log(`  💾 Database: ${dbConfig?.dialect ?? 'none'}\n`)
	})
}

main().catch((err) => {
	console.error('[nexus] failed to start:', err)
	process.exit(1)
})
