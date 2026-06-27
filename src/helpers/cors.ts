/**
 * CORS middleware — Cross-Origin Resource Sharing.
 *
 * @example
 * ```ts
 * // config/app.ts
 * export default {
 *   middleware: {
 *     cors: {
 *       origin: ['https://myapp.com', 'http://localhost:5173'],
 *       methods: ['GET', 'POST', 'PUT', 'DELETE'],
 *     }
 *   }
 * }
 * ```
 */
import { Elysia } from 'elysia'

export interface CORSOptions {
	/** Allowed origins. Default: '*' */
	origin?: string | string[] | ((origin: string) => boolean | string | undefined)

	/** Allowed methods. Default: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' */
	methods?: string

	/** Allowed headers. Default: 'Content-Type,Authorization,X-Inertia' */
	allowedHeaders?: string

	/** Expose headers. */
	exposeHeaders?: string

	/** Allow credentials (cookies). Default: true */
	credentials?: boolean

	/** Max age for preflight cache (seconds). Default: 86400 */
	maxAge?: number
}

/**
 * Create a CORS middleware plugin.
 */
export function corsMiddleware(options: CORSOptions = {}) {
	const {
		origin = '*',
		methods = 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
		allowedHeaders = 'Content-Type,Authorization,X-Inertia,X-Requested-With',
		credentials = true,
		maxAge = 86400,
		exposeHeaders,
	} = options

	const app = new Elysia({ name: 'nexus-cors' })

	app.derive(async (ctx: any) => {
		const requestOrigin = ctx.request.headers.get('origin')

		// Determine allowed origin
		let allowOrigin = '*'
		if (origin === '*') {
			allowOrigin = requestOrigin ?? '*'
		} else if (typeof origin === 'string') {
			allowOrigin = origin
		} else if (Array.isArray(origin)) {
			if (requestOrigin && origin.includes(requestOrigin)) {
				allowOrigin = requestOrigin
			}
		} else if (typeof origin === 'function') {
			const result = origin(requestOrigin ?? '')
			if (result) allowOrigin = typeof result === 'string' ? result : requestOrigin ?? '*'
		}

		// Handle preflight
		if (ctx.request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: {
					'Access-Control-Allow-Origin': allowOrigin,
					'Access-Control-Allow-Methods': methods,
					'Access-Control-Allow-Headers': allowedHeaders,
					'Access-Control-Max-Age': String(maxAge),
					...(credentials ? { 'Access-Control-Allow-Credentials': 'true' } : {}),
				},
			})
		}

		// Store for later use
		return { _corsOrigin: allowOrigin }
	})

	app.afterResponse((ctx: any) => {
		const allowOrigin = ctx._corsOrigin ?? '*' 
		ctx.set.headers ??= {}
		ctx.set.headers['Access-Control-Allow-Origin'] = allowOrigin
		if (credentials && allowOrigin !== '*') {
			ctx.set.headers['Access-Control-Allow-Credentials'] = 'true'
		}
		if (exposeHeaders) {
			ctx.set.headers['Access-Control-Expose-Headers'] = exposeHeaders
		}
	})

	return app
}
