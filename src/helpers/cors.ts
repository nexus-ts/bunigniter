/**
 * CORS middleware — Cross-Origin Resource Sharing.
 *
 * Usage:
 * ```ts
 * import { Elysia } from 'elysia'
 * import { corsMiddleware } from 'bunigniter/helpers/cors'
 *
 * const app = new Elysia()
 *   .use(corsMiddleware({
 *     origin: ['https://myapp.com', 'http://localhost:5173'],
 *   }))
 * ```
 */
import { Elysia } from "elysia"

export interface CORSOptions {
	origin?: string | string[] | ((origin: string) => boolean | string | undefined)
	methods?: string
	allowedHeaders?: string
	exposeHeaders?: string
	credentials?: boolean
	maxAge?: number
}

function resolveOrigin(requestOrigin: string | null, origin: CORSOptions["origin"]): string {
	if (origin === "*") return requestOrigin ?? "*"
	if (typeof origin === "string") return origin
	if (Array.isArray(origin)) {
		if (requestOrigin && origin.includes(requestOrigin)) return requestOrigin
		return origin[0] ?? "*"
	}
	if (typeof origin === "function") {
		const result = origin(requestOrigin ?? "")
		if (result === true) return requestOrigin ?? "*"
		if (typeof result === "string") return result
	}
	return "*"
}

/**
 * Create a CORS middleware.
 *
 * Strategy:
 *  - `.options('/*')` for OPTIONS preflight (route matching works across plugins)
 *  - `derive` with `scope: 'global'` to make CORS headers available in every route's set
 *    (derive at global scope DOES extend the context for all routes)
 */
export function corsMiddleware(opts: CORSOptions = {}) {
	const origin = opts.origin ?? "*"
	const methods = opts.methods ?? "GET,POST,PUT,PATCH,DELETE,OPTIONS"
	const allowedHeaders = opts.allowedHeaders ?? "Content-Type,Authorization,X-Inertia,X-Requested-With"
	const credentials = opts.credentials ?? true
	const maxAge = opts.maxAge ?? 86400
	const exposeHeaders = opts.exposeHeaders

	return (
		new Elysia({ name: "bunigniter-cors" })
			// Derive CORS origin globally — this extends context for ALL routes
			.derive("global", ({ request }: any) => ({
				_corsHeaders: (() => {
					const requestOrigin = request.headers.get("origin")
					const allowOrigin = resolveOrigin(requestOrigin, origin)
					const h: Record<string, string> = {
						"access-control-allow-origin": allowOrigin,
					}
					if (credentials) h["access-control-allow-credentials"] = "true"
					if (exposeHeaders) h["access-control-expose-headers"] = exposeHeaders
					return h
				})(),
			}))
			// OPTIONS preflight
			.options("/*", ({ request }) => {
				const requestOrigin = request.headers.get("origin")
				const allowOrigin = resolveOrigin(requestOrigin, origin)
				const h: Record<string, string> = {
					"access-control-allow-origin": allowOrigin,
					"access-control-allow-methods": methods,
					"access-control-allow-headers": allowedHeaders,
					"access-control-max-age": String(maxAge),
				}
				if (credentials) h["access-control-allow-credentials"] = "true"
				return new Response(null, { status: 204, headers: h })
			})
			// Use beforeHandle at global scope to apply CORS headers
			// This runs for every matched route on the parent app
			.beforeHandle("global", ({ set, _corsHeaders }: any) => {
				if (_corsHeaders) {
					set.headers = { ...set.headers, ..._corsHeaders }
				}
			})
	)
}
