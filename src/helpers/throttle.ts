/**
 * Rate Limiter — in-memory rate limiting for API routes.
 *
 * Uses Elysia v2's `beforeHandle('global')` to check limits before handler.
 * Each `rateLimiter()` call gets its own in-memory store.
 *
 * @example
 * ```ts
 * import { Elysia } from 'elysia'
 * import { rateLimiter } from 'bunigniter/helpers/throttle'
 *
 * const app = new Elysia()
 *   .use(rateLimiter({ max: 100, window: 60000 }))
 * ```
 */
import { Elysia } from "elysia"

export interface ThrottleOptions {
	max?: number
	window?: number
	statusCode?: number
	message?: string
	keyFn?: (ctx: any) => string
	skip?: string[]
}

interface Entry {
	count: number
	resetAt: number
}

const cleanupTimers = new Map<Map<string, Entry>, Timer>()

/**
 * Create a rate limiter middleware for Elysia v2.
 * Each call creates its own isolated store.
 */
export function rateLimiter(options: ThrottleOptions = {}) {
	const max = options.max ?? 60
	const window = options.window ?? 60_000
	const statusCode = options.statusCode ?? 429
	const message = options.message ?? "Too Many Requests"
	const keyFn = options.keyFn
	const skip = options.skip ?? ["/health"]

	const store = new Map<string, Entry>()

	// Per-store cleanup
	if (!cleanupTimers.has(store)) {
		const timer = setInterval(() => {
			const now = Date.now()
			for (const [key, entry] of store) {
				if (entry.resetAt <= now) store.delete(key)
			}
		}, 60_000)
		cleanupTimers.set(store, timer)
	}

	return new Elysia({ name: "bunigniter-throttle" }).beforeHandle("global", ({ request, set }: any) => {
		const url = new URL(request.url)
		const path = url.pathname
		if (skip.some((s: string) => path.startsWith(s))) return

		const ip =
			request.headers.get("x-forwarded-for")?.split(",")[0]?.trim?.() ??
			request.headers.get("cf-connecting-ip") ??
			"127.0.0.1"
		const key = keyFn ? keyFn({ request }) : `${ip}:${path}`
		const now = Date.now()

		let entry = store.get(key)
		if (!entry || entry.resetAt <= now) {
			entry = { count: 0, resetAt: now + window }
			store.set(key, entry)
		}

		entry.count++
		const remaining = Math.max(0, max - entry.count)

		set.headers = set.headers || {}
		set.headers["x-ratelimit-limit"] = String(max)
		set.headers["x-ratelimit-remaining"] = String(remaining)
		set.headers["x-ratelimit-reset"] = String(Math.ceil(entry.resetAt / 1000))

		if (entry.count > max) {
			return new Response(
				JSON.stringify({
					error: message,
					retryAfter: Math.ceil((entry.resetAt - now) / 1000),
				}),
				{
					status: statusCode,
					headers: {
						"content-type": "application/json",
						"retry-after": String(Math.ceil((entry.resetAt - now) / 1000)),
					},
				},
			)
		}
	})
}
