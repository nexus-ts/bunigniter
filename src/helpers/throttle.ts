/**
 * Rate Limiter — in-memory rate limiting for API routes.
 *
 * @example
 * ```ts
 * // config/app.ts
 * export default {
 *   middleware: {
 *     throttle: {
 *       max: 100,        // 100 requests
 *       window: 60000,   // per 60 seconds
 *     }
 *   }
 * }
 *
 * // Or per-route in a controller:
 * import { rateLimiter } from '../src/helpers/throttle'
 * ```
 */
import { Elysia } from 'elysia'

export interface ThrottleOptions {
	/** Maximum requests per window. Default: 60 */
	max?: number

	/** Time window in milliseconds. Default: 60000 (1 min) */
	window?: number

	/** Status code when rate limited. Default: 429 */
	statusCode?: number

	/** Error message when rate limited. Default: 'Too Many Requests' */
	message?: string

	/** Key function — defaults to IP address. */
	keyFn?: (ctx: any) => string

	/** Skip rate limiting for certain paths. */
	skip?: string[]
}

interface RateLimitEntry {
	count: number
	resetAt: number
}

/** In-memory store (Map<key, entry>). */
const store = new Map<string, RateLimitEntry>()

// Periodic cleanup of expired entries
let cleanupInterval: Timer | null = null
function startCleanup(interval = 60000) {
	if (cleanupInterval) return
	cleanupInterval = setInterval(() => {
		const now = Date.now()
		for (const [key, entry] of store) {
			if (entry.resetAt <= now) store.delete(key)
		}
	}, interval)
}

/**
 * Create a rate limiter middleware.
 *
 * @example
 * ```ts
 * app.use(rateLimiter({ max: 100, window: 60000 }))
 * ```
 */
export function rateLimiter(options: ThrottleOptions = {}) {
	const {
		max = 60,
		window = 60000,
		statusCode = 429,
		message = 'Too Many Requests',
		keyFn,
		skip = ['/health'],
	} = options

	startCleanup()

	const app = new Elysia({ name: 'nexus-throttle' })

	app.request((ctx: any) => {
		const url = new URL(ctx.request.url)
		const path = url.pathname

		// Skip excluded paths
		if (skip.some((s) => path.startsWith(s))) return

		// Determine rate limit key
		const ip =
			ctx.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
			ctx.request.headers.get('cf-connecting-ip') ??
			'127.0.0.1'

		const key = keyFn ? keyFn(ctx) : `${ip}:${path}`
		const now = Date.now()

		let entry = store.get(key)
		if (!entry || entry.resetAt <= now) {
			entry = { count: 1, resetAt: now + window }
			store.set(key, entry)

			// Set rate limit headers
			ctx.set.headers ??= {}
			ctx.set.headers['X-RateLimit-Limit'] = String(max)
			ctx.set.headers['X-RateLimit-Remaining'] = String(max - 1)
			ctx.set.headers['X-RateLimit-Reset'] = String(Math.ceil(entry.resetAt / 1000))
			return
		}

		entry.count++
		ctx.set.headers ??= {}
		ctx.set.headers['X-RateLimit-Limit'] = String(max)
		ctx.set.headers['X-RateLimit-Remaining'] = String(Math.max(0, max - entry.count))
		ctx.set.headers['X-RateLimit-Reset'] = String(Math.ceil(entry.resetAt / 1000))

		if (entry.count > max) {
			// Return 429
			return new Response(
				JSON.stringify({
					error: message,
					retryAfter: Math.ceil((entry.resetAt - now) / 1000),
				}),
				{
					status: statusCode,
					headers: {
						'content-type': 'application/json',
						'retry-after': String(Math.ceil((entry.resetAt - now) / 1000)),
					},
				}
			)
		}
	})

	return app
}

/**
 * Get rate limit status for a key (for diagnostic endpoints).
 */
export function getRateLimitStatus(ip: string, path: string): {
	remaining: number
	limit: number
	resetAt: number
} {
	const key = `${ip}:${path}`
	const entry = store.get(key)
	if (!entry) return { remaining: 60, limit: 60, resetAt: Date.now() + 60000 }
	return {
		remaining: Math.max(0, 60 - entry.count),
		limit: 60,
		resetAt: entry.resetAt,
	}
}
