/**
 * Logger middleware — CodeIgniter-style request logging.
 *
 * Logs method, path, status, and duration for every request.
 *
 * @example
 * ```ts
 * import { Elysia } from 'elysia'
 * import { loggerMiddleware } from 'bunigniter/helpers/logger'
 *
 * const app = new Elysia()
 *   .use(loggerMiddleware())
 * ```
 */
import { Elysia } from "elysia"

export interface LoggerOptions {
	enabled?: boolean
	showQuery?: boolean
	showBody?: boolean
	logFn?: (message: string, data?: any) => void
	skip?: string[]
}

const STATUS_COLORS: Record<string, string> = {
	"2": "\x1b[32m",
	"3": "\x1b[36m",
	"4": "\x1b[33m",
	"5": "\x1b[31m",
}
const RESET = "\x1b[0m"
const DIM = "\x1b[2m"

/**
 * Create a request logger middleware for Elysia v2.
 *
 * Uses `derive('global')` to capture start time without affecting response,
 * `afterResponse('global')` to log after response is sent.
 */
export function loggerMiddleware(options: LoggerOptions = {}) {
	const enabled = options.enabled ?? true
	const showQuery = options.showQuery ?? false
	const logFn = options.logFn ?? console.log
	const skip = options.skip ?? ["/health"]

	if (!enabled) return new Elysia({ name: "bunigniter-logger" })

	return new Elysia({ name: "bunigniter-logger" })
		.derive("global", ({ request }: any) => {
			const url = new URL(request.url)
			const path = url.pathname
			if (skip.some((s: string) => path.startsWith(s))) return {}

			return {
				_logStart: performance.now(),
				_logMethod: request.method,
				_logPath: path + (showQuery ? url.search : ""),
			}
		})
		.afterHandle("global" as any, ({ _logStart, _logMethod, _logPath, set, response }: any) => {
			if (!_logStart) return response

			const duration = Math.round((performance.now() - _logStart) * 100) / 100
			const status = set?.status ?? 200
			const statusGroup = String(status)[0]
			const color = STATUS_COLORS[statusGroup] ?? ""
			const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19)
			const methodPad = (_logMethod ?? "?").padEnd(7)

			logFn(
				`${DIM}${timestamp}${RESET} ${methodPad} ${color}${status}${RESET} ${_logPath ?? "?"} ${DIM}${duration}ms${RESET}`,
			)
			return response
		})
}
