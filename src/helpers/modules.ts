/**
 * HMVC Module System — load modules from `modules/` directory.
 *
 * Each module has its own routes/ and views/:
 * ```
 * modules/
 *   blog/
 *     routes/posts.ts   → GET /blog/posts
 *     views/posts.html
 *     config/app.ts     (optional, module-level config)
 *   shop/
 *     routes/products.ts → GET /shop/products
 *     views/products.html
 * ```
 *
 * Cross-module calls:
 * ```ts
 * import { moduleRun } from '../helpers/modules'
 * const posts = await moduleRun('blog/posts', ctx)
 * ```
 */
import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import type { Elysia } from "elysia"
import type { DbClient } from "../db/drizzle"
import type { Cache } from "../helpers/cache"
import type { Mail } from "../helpers/mail"
import type { Queue } from "../helpers/queue"
import type { Upload } from "../helpers/upload"
import { registerFileRoutes } from "../router/file-router"

export interface ModuleServices {
	db?: DbClient
	dbs?: Record<string, DbClient>
	cache?: Cache
	queue?: Queue
	upload?: Upload
	mail?: Mail
}

/** Scan and register all modules in the `modules/` directory. */
export async function registerModules(app: Elysia, services: ModuleServices): Promise<void> {
	// Compute modules directory relative to CWD
	const modulesDir = "modules"
	if (!existsSync(modulesDir)) return

	const entries = readdirSync(modulesDir, { withFileTypes: true })

	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name.startsWith("_")) continue

		const moduleName = entry.name
		const routesDir = join(modulesDir, moduleName, "routes")
		const viewsDir = join(modulesDir, moduleName, "views")

		if (!existsSync(routesDir)) continue

		// Each module registers its routes with its name as prefix
		await registerFileRoutes(app, {
			directory: routesDir,
			viewsDir,
			prefix: `/${moduleName}`,
			...services,
		})

		console.log(`[module] ${moduleName} → /${moduleName}/*`)
	}
}

/**
 * Call a module's controller method programmatically.
 * Syntax: `moduleRun('blog/posts/index', ctx)` or `moduleRun('blog/posts', ctx)`
 */
export async function moduleRun(path: string, ctx?: any): Promise<any> {
	const parts = path.split("/")
	const moduleName = parts[0]
	const method = parts.length > 2 ? parts.pop() : "index"
	const controllerPath = parts.slice(1).join("/") || "index"

	const fullPath = join(process.cwd(), "modules", moduleName, "routes", `${controllerPath}.ts`)
	if (!existsSync(fullPath)) {
		throw new Error(`[hmvc] Module route not found: ${moduleName}/${controllerPath}`)
	}

	const mod = await import(fullPath)
	const ControllerClass = findExport(mod)
	if (!ControllerClass) throw new Error(`[hmvc] No controller in ${moduleName}/${controllerPath}`)

	const instance = new ControllerClass()
	if (ctx) {
		;(instance as any).ctx = ctx
		if (ctx.session) (instance as any).session = ctx.session
		if (ctx.db) (instance as any).db = ctx.db
	}

	const fn = instance[method]
	if (typeof fn !== "function") throw new Error(`[hmvc] No method ${method} in ${moduleName}/${controllerPath}`)

	return fn.call(instance)
}

function findExport(mod: Record<string, any>): any {
	for (const key of Object.keys(mod)) {
		const val = mod[key]
		if (typeof val === "function" && val.prototype) {
			let proto = val.prototype
			while (proto) {
				if (proto.constructor?.name === "Controller") return val
				proto = Object.getPrototypeOf(proto)
			}
		}
	}
	return null
}
