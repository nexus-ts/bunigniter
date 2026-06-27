/**
 * Logger middleware — CodeIgniter-style request logging.
 *
 * Logs method, path, status, and duration for every request.
 *
 * @example
 * ```ts
 * app.use(loggerMiddleware())
 * // [2026-06-27 14:30:00] GET /api/users 200 12ms
 * ```
 */
import { Elysia } from 'elysia'

export interface LoggerOptions {
	/** Enable/disable logging. Default: true */
	enabled?: boolean

	/** Show query strings. Default: false */
	showQuery?: boolean

	/** Show request body (truncated). Default: false */
	showBody?: boolean

	/** Custom log function. Default: console.log */
	logFn?: (message: string, data?: any) => void

	/** Skip logging for certain paths. */
	skip?: string[]
}

/** Default status colors (ANSI). */
const STATUS_COLORS: Record<string, string> = {
	'2': '\x1b[32m', // green
	'3': '\x1b[36m', // cyan
	'4': '\x1b[33m', // yellow
	'5': '\x1b[31m', // red
}

const RESET = '\x1b[0m'
const DIM = '\x1b[2m'

/**
 * Create a request logger middleware.
 */
export function loggerMiddleware(options: LoggerOptions = {}) {
	const {
		enabled = true,
		showQuery = false,
		showBody = false,
		logFn = console.log,
		skip = ['/health'],
	} = options

	if (!enabled) {
		const app = new Elysia({ name: 'nexus-logger' })
		return app
	}

	const app = new Elysia({ name: 'nexus-logger' })

	// Elysia v2: use 'request' lifecycle instead of 'onRequest'
	app.request((ctx: any) => {
		const url = ctx.request.url
		const urlObj = new URL(url)
		const path = urlObj.pathname

		// Skip logging for certain paths
		if (skip.some((s) => path.startsWith(s))) return

		const start = performance.now()
		const method = ctx.request.method
		const query = showQuery ? urlObj.search : ''

		ctx._logStart = start
		ctx._logMethod = method
		ctx._logPath = path + query
	})

	app.afterResponse((ctx: any) => {
		if (!ctx._logStart) return

		const duration = Math.round((performance.now() - ctx._logStart) * 100) / 100
		const status = ctx.set.status ?? 200
		const statusGroup = String(status)[0]
		const color = STATUS_COLORS[statusGroup] ?? ''

		const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)
		const methodPad = ctx._logMethod.padEnd(7)

		logFn(
			`${DIM}${timestamp}${RESET} ${methodPad} ${color}${status}${RESET} ${ctx._logPath} ${DIM}${duration}ms${RESET}`
		)
	})

	return app
}
