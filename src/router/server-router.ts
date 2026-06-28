/**
 * Server Router — Void-style file-based routing with method exports.
 *
 * Scans `routes/` directory. Each file exports
 * HTTP method constants (`GET`, `POST`, etc.) created via `defineHandler`.
 *
 * Directory structure:
 * ```
 * routes/
 * ├── api/
 * │   ├── hello.ts          → GET|POST /api/hello
 * │   └── users/
 * │       ├── index.ts       → GET|POST /api/users
 * │       └── [id].ts        → GET|PUT|DELETE /api/users/:id
 * └── webhooks/
 *     └── stripe.ts          → POST /webhooks/stripe
 * ```
 *
 * @example
 * ```ts
 * // routes/api/users.ts
 * import { defineHandler } from 'nexusts'
 *
 * export const GET = defineHandler(async (c) => {
 *   return db.select().from(users)
 * })
 *
 * export const POST = defineHandler.withValidator({
 *   body: insertUserSchema
 * })(async (c, { body }) => {
 *   return db.insert(users).values(body).returning()
 * })
 * ```
 */
import { readdirSync, statSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { Elysia } from 'elysia'

/**
 * Register all routes from the `routes/` directory.
 * Each file exports `GET`, `POST`, `PUT`, `DELETE`, `PATCH` named constants.
 */
export async function registerServerRoutes(app: Elysia, dir: string = 'routes', prefix: string = ''): Promise<void> {
	if (!existsSync(dir)) return

	const files = scanRouteFiles(dir)

	for (const file of files) {
		const fullPath = join(process.cwd(), dir, file)
		let mod
		try {
			mod = await import(fullPath)
		} catch (e: any) {
			console.error('[server-router] Error importing', file, ':', e.message)
			continue
		}

		// Build URL path from file path
		const urlPath = routeFilePathToUrl(file, prefix)

		// Register each exported HTTP method
		const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const
		for (const method of methods) {
			const handler = mod[method]
			if (typeof handler !== 'function') continue

			const lower = method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch'
			;(app as any)[lower](urlPath, async (ctx: any) => {
				return handler(ctx)
			})
		}
	}
}

/** Scan for route files, excluding _prefix and .server.ts. */
function scanRouteFiles(baseDir: string, relativeDir = ''): string[] {
	const dir = join(baseDir, relativeDir)
	const files: string[] = []
	const entries = readdirSync(dir, { withFileTypes: true })

	for (const entry of entries) {
		if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue

		if (entry.isDirectory()) {
			files.push(...scanRouteFiles(baseDir, relativeDir ? `${relativeDir}/${entry.name}` : entry.name))
		} else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.server.ts') && !entry.name.endsWith('.test.ts')) {
			files.push(relativeDir ? `${relativeDir}/${entry.name}` : entry.name)
		}
	}

	return files.sort()
}

/** Convert file path to URL path, matching Void conventions. */
function routeFilePathToUrl(file: string, prefix: string): string {
	let url = file
		.replace(/\.ts$/, '')
		.replace(/\/index$/, '')
		.replace(/\[\.\.\.\]/g, '*')
		.replace(/\[(\w+)\]/g, ':$1')

	return `${prefix}/${url}`
}
