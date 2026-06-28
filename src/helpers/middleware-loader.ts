/**
 * Middleware Loader — Void-style file-based middleware directory.
 *
 * Place files in `middleware/` with numeric prefixes for ordering:
 * ```
 * middleware/
 * ├── 01.logger.ts     ← runs first
 * ├── 02.auth.ts       ← runs second
 * ├── 03.cors.ts       ← runs third
 * └── _helpers.ts      ← ignored (starts with _)
 * ```
 *
 * Each file exports a default middleware function:
 * ```ts
 * // middleware/01.request-id.ts
 * import { defineMiddleware } from 'nexusts'
 *
 * export default defineMiddleware(async (c, next) => {
 *   const start = performance.now()
 *   await next()
 *   c.header('X-Response-Time', `${performance.now() - start}ms`)
 * })
 * ```
 *
 * Middleware can set context variables via c.set():
 * ```ts
 * declare module 'elysia' {
 *   interface ElysiaContext {
 *     requestId: string
 *   }
 * }
 * ```
 */
import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import type { Elysia } from "elysia"

/** Middleware function signature (Hono-compatible). */
export type MiddlewareFn = (c: any, next: () => Promise<void>) => Promise<void> | void

/**
 * Define middleware with proper typing.
 *
 * @example
 * ```ts
 * // middleware/01.logger.ts
 * import { defineMiddleware } from 'nexusts'
 *
 * export default defineMiddleware(async (c, next) => {
 *   console.log(c.request.method, c.request.url)
 *   await next()
 * })
 * ```
 */
export function defineMiddleware(fn: MiddlewareFn): MiddlewareFn {
	return fn
}

/** Loaded middleware entry. */
interface MiddlewareEntry {
	name: string
	order: number
	fn: MiddlewareFn
}

/**
 * Load and apply middleware from the `middleware/` directory.
 *
 * Files starting with `_` are ignored.
 * Files with numeric prefixes (e.g. `01_logger.ts`) are sorted by prefix.
 * Files without numeric prefix are loaded alphabetically after numbered ones.
 *
 * @param dir - Middleware directory path. Default: 'middleware'
 */
export async function loadMiddleware(dir: string = "middleware"): Promise<MiddlewareFn[]> {
	if (!existsSync(dir)) return []

	const entries: MiddlewareEntry[] = []
	const files = readdirSync(dir, { withFileTypes: true })

	for (const file of files) {
		if (!file.isFile() || !file.name.endsWith(".ts") || file.name.startsWith("_")) continue

		const fullPath = join(process.cwd(), dir, file.name)
		const mod = await import(fullPath)
		const fn = mod.default ?? mod.middleware
		if (typeof fn !== "function") continue

		// Extract numeric prefix (e.g. "01" from "01_logger.ts")
		const match = file.name.match(/^(\d+)[._-]/)
		const order = match ? parseInt(match[1], 10) : 999

		entries.push({
			name: file.name.replace(/\.ts$/, ""),
			order,
			fn,
		})
	}

	// Sort by order, then by name for stability
	entries.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))

	return entries.map((e) => e.fn)
}

/**
 * Apply middleware to an Elysia app.
 * Uses Elysia v2's `request()` lifecycle hook.
 */
export function applyMiddlewareToApp(app: Elysia, middleware: MiddlewareFn[]): void {
	for (const fn of middleware) {
		app.request(async (ctx: any) => {
			await fn(ctx, async () => {})
		})
	}
}
