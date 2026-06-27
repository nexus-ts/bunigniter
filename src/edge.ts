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
 * import app from './src/edge'
 * export default { fetch: app.fetch }
 * ```
 *
 * Usage (Deno):
 * ```ts
 * import app from './src/edge'
 * Deno.serve(app.fetch)
 * ```
 */
import { Elysia } from 'elysia'
import { applyMiddleware } from './helpers/middleware'

/**
 * Create an edge-compatible application.
 * Routes must be registered manually or via a pre-built router.
 */
export function createEdgeApp(config?: { middleware?: any }) {
	const app = new Elysia()

	// Apply middleware
	applyMiddleware(app, config?.middleware)

	// Health check
	app.get('/health', () => new Response(JSON.stringify({
		status: 'ok',
		runtime: typeof Bun !== 'undefined' ? 'bun' :
			typeof (globalThis as any).Deno !== 'undefined' ? 'deno' :
			typeof (globalThis as any).navigator !== 'undefined' ? 'cloudflare' :
			'unknown',
		timestamp: new Date().toISOString(),
	}), {
		headers: { 'content-type': 'application/json' },
	}))

	return app
}

/**
 * Register a route directly (edge-compatible, no filesystem access).
 *
 * @example
 * ```ts
 * import { createEdgeApp, register } from './src/edge'
 * const app = createEdgeApp()
 * register(app, 'GET', '/api/hello', () => new Response('Hello Edge!'))
 * export default { fetch: app.fetch }
 * ```
 */
export function register(
	app: Elysia,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
	path: string,
	handler: (...args: any[]) => any
): void {
	const lower = method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch'
	;(app as any)[lower](path, handler)
}
