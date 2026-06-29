/**
 * Edge entry point — for Cloudflare Workers, Deno, and other Edge runtimes.
 *
 * Unlike the Bun entry point (`src/index.ts`), this version:
 * - Does NOT use file-based routing (pages are pre-registered)
 * - Does NOT use node:fs modules
 * - Uses Elysia v2's web-standard adapter
 * - Exposes `fetch` handler directly
 *
 * Usage (Cloudflare Workers):
 * ```ts
 * import { createEdgeApp } from "bunigniter/edge"
 * const app = createEdgeApp()
 * // ... register routes ...
 * export default { fetch: app.fetch }
 * ```
 *
 * Usage with D1:
 * ```ts
 * import { createD1App, EdgeController } from "bunigniter/edge"
 * import { DbClient } from "bunigniter/db/drizzle"
 *
 * export class Items extends EdgeController {
 *   async index() { return this.json(await this.db.all("SELECT * FROM items")) }
 * }
 *
 * export default {
 *   fetch(request, env) {
 *     const db = new DbClient({ dialect: "d1", connection: { binding: env.DB } })
 *     return createD1App(db, (app) => {
 *       app.get("/items", async (ctx) => {
 *         const ctrl = new Items()
 *         ctrl.ctx = ctx; ctrl.db = db
 *         return ctrl.index()
 *       })
 *     }).fetch(request)
 *   }
 * }
 * ```
 */
import { Elysia } from "elysia"
import { DbClient } from "./db/drizzle"
import { EdgeController } from "./edge-controller"
import { applyMiddleware } from "./helpers/middleware"

// ─── Cloudflare Workers D1 type declaration ─────────────────
// Declared here so edge.ts compiles without @cloudflare/workers-types.
// @ts-expect-error — not all environments have D1
declare class D1Database {
	prepare(sql: string): D1PreparedStatement
}
declare class D1PreparedStatement {
	bind(...params: unknown[]): D1PreparedStatement
	run(): Promise<{ results?: any[]; meta?: { changes?: number } }>
}

export { DbClient, EdgeController }

/**
 * Create an edge-compatible application.
 * Routes must be registered manually or via a pre-built router.
 */
export function createEdgeApp(config?: { middleware?: any }) {
	const app = new Elysia()

	// Apply middleware
	applyMiddleware(app, config?.middleware)

	// Health check
	app.get(
		"/health",
		() =>
			new Response(
				JSON.stringify({
					status: "ok",
					runtime:
						typeof Bun !== "undefined"
							? "bun"
							: typeof (globalThis as any).Deno !== "undefined"
								? "deno"
								: typeof (globalThis as any).navigator !== "undefined"
									? "cloudflare"
									: "unknown",
					timestamp: new Date().toISOString(),
				}),
				{
					headers: { "content-type": "application/json" },
				},
			),
	)

	return app
}

/**
 * Create an edge app pre-configured with a D1 database client.
 *
 * @example
 * ```ts
 * // Cloudflare Workers
 * export default {
 *   fetch(request, env) {
 *     return createD1App(env.DB, (app) => {
 *       app.get("/api/items", async (ctx) => {
 *         const { results } = await env.DB.prepare("SELECT * FROM items").run()
 *         return new Response(JSON.stringify(results))
 *       })
 *     }).fetch(request)
 *   }
 * }
 * ```
 */
export function createD1App(db: D1Database | DbClient, registerRoutes: (app: Elysia) => void): Elysia {
	const app = createEdgeApp()

	// Wrap raw D1 binding as DbClient if needed
	const dbClient: DbClient = db instanceof DbClient ? db : new DbClient({ dialect: "d1", connection: { binding: db } })

	// Make dbClient available via Elysia decorate
	app.decorate("db", dbClient)

	registerRoutes(app)

	return app
}

/**
 * Register a route handler using an EdgeController.
 *
 * @example
 * ```ts
 * import { createEdgeApp, registerController } from "bunigniter/edge"
 * import { ItemsController } from "./routes/items"
 *
 * const app = createEdgeApp()
 * registerController(app, ItemsController, { db })
 * ```
 */
export function registerController<T extends EdgeController>(
	app: Elysia,
	ControllerClass: new () => T,
	options: {
		db: DbClient
		prefix?: string
		methods?: string[]
	},
): void {
	const prefix = options.prefix ?? ""
	const db = options.db
	const methods = options.methods ?? ["index", "show", "create", "update", "destroy"]

	const methodConfig: Record<string, { verb: string; path: string; needsId: boolean }> = {
		index: { verb: "GET", path: prefix || "/", needsId: false },
		show: { verb: "GET", path: `${prefix}/:id`, needsId: true },
		create: { verb: "POST", path: prefix || "/", needsId: false },
		update: { verb: "PUT", path: `${prefix}/:id`, needsId: true },
		destroy: { verb: "DELETE", path: `${prefix}/:id`, needsId: true },
	}

	for (const methodName of methods) {
		const cfg = methodConfig[methodName]
		if (!cfg) continue

		const lowerVerb = cfg.verb.toLowerCase() as "get" | "post" | "put" | "delete" | "patch"

		;(app as any)[lowerVerb](cfg.path, async (ctx: any) => {
			const ctrl = new ControllerClass()
			ctrl.ctx = ctx
			ctrl.db = db

			const id = cfg.needsId ? Number(ctx.params?.id) : undefined
			const result = await (ctrl as any)[methodName](id)

			if (result instanceof Response) return result
			if (result !== undefined && result !== null) {
				return new Response(JSON.stringify(result), {
					status: 200,
					headers: { "content-type": "application/json" },
				})
			}
			return new Response(null, { status: 204 })
		})
	}
}

/**
 * Register a route directly (edge-compatible, no filesystem access).
 *
 * @example
 * ```ts
 * import { createEdgeApp, register } from "bunigniter/edge"
 * const app = createEdgeApp()
 * register(app, 'GET', '/api/hello', () => new Response('Hello Edge!'))
 * export default { fetch: app.fetch }
 * ```
 */
export function register(
	app: Elysia,
	method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
	path: string,
	handler: (...args: any[]) => any,
): void {
	const lower = method.toLowerCase() as "get" | "post" | "put" | "delete" | "patch"
	;(app as any)[lower](path, handler)
}
