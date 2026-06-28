/**
 * Middleware loader — applies configured middleware to an Elysia app.
 *
 * Reads from config/app.ts and applies middleware in order.
 *
 * @example
 * ```ts
 * // src/index.ts
 * import { applyMiddleware } from './helpers/middleware'
 * applyMiddleware(app, config.middleware)
 * ```
 */
import type { Elysia } from "elysia"
import { type CORSOptions, corsMiddleware } from "./cors"
import { type CSRFOptions, csrfMiddleware } from "./csrf"
import { type LoggerOptions, loggerMiddleware } from "./logger"
import { rateLimiter, type ThrottleOptions } from "./throttle"

/** Middleware configuration from config/app.ts. */
export interface MiddlewareConfig {
	/** CORS settings. false to disable. */
	cors?: CORSOptions | false

	/** Logger settings. false to disable. */
	logger?: LoggerOptions | false

	/** CSRF protection. false to disable. */
	csrf?: CSRFOptions | false

	/** Rate limiter. false to disable. */
	throttle?: ThrottleOptions | false
}

/**
 * Apply middleware to an Elysia app based on config.
 */
export function applyMiddleware(app: Elysia, config?: MiddlewareConfig): void {
	if (!config) return

	// Order matters: CORS → Logger → CSRF → Rate Limit

	if (config.cors !== false) {
		app.use(corsMiddleware(config.cors ?? {}))
	}

	if (config.logger !== false) {
		app.use(loggerMiddleware(config.logger ?? {}))
	}

	if (config.csrf !== false) {
		app.use(csrfMiddleware(config.csrf ?? {}))
	}

	if (config.throttle !== false) {
		app.use(rateLimiter(config.throttle ?? {}))
	}
}
