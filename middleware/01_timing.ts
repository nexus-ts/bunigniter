/**
 * Request timing middleware — adds X-Response-Time header.
 *
 * Runs first due to `01_` prefix.
 */
import { defineMiddleware } from '../src/helpers/middleware-loader'

export default defineMiddleware(async (c, next) => {
	const start = performance.now()
	await next()
	const duration = Math.round((performance.now() - start) * 100) / 100
	// Elysia v2: set headers via ctx.set.headers
	if (!c.set) c.set = {}
	if (!c.set.headers) c.set.headers = {}
	c.set.headers['X-Response-Time'] = `${duration}ms`
})
