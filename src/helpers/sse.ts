/**
 * SSE — Server-Sent Events helper.
 *
 * @example
 * ```ts
 * // routes/sse.ts
 * import { sse } from '@nexusts/core/helpers/sse'
 * import { Controller } from '@nexusts/core'
 *
 * export class Events extends Controller {
 *   async clock() {
 *     return sse(this.ctx, async (send) => {
 *       let n = 0
 *       const timer = setInterval(() => {
 *         n++
 *         send({ event: 'tick', data: { count: n, time: new Date().toISOString() } })
 *         if (n >= 10) { clearInterval(timer); send({ event: 'done' }) }
 *       }, 1000)
 *       // Cleanup on client disconnect
 *       return () => clearInterval(timer)
 *     })
 *   }
 * }
 * ```
 */
export function sse(
	ctx: any,
	handler: (
		send: (event: SSEMessage) => void
	) => void | (() => void)
): Response {
	const encoder = new TextEncoder()
	let cleanup: (() => void) | null = null

	const stream = new ReadableStream({
		start(controller) {
			// Send data
			const send = (msg: SSEMessage) => {
				try {
					const text = formatSSE(msg)
					controller.enqueue(encoder.encode(text))
				} catch { /* stream closed */ }
			}

			// Run handler — it may return a cleanup function
			const result = handler(send)
			if (typeof result === 'function') {
				cleanup = result
			}
		},
		cancel() {
			cleanup?.()
		},
	})

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache',
			'connection': 'keep-alive',
		},
	})
}

interface SSEMessage {
	/** Event type (optional, default: 'message'). */
	event?: string
	/** Data payload (required). Sent as JSON. */
	data?: any
	/** Event ID for Last-Event-ID reconnection. */
	id?: string | number
	/** Retry interval in ms. */
	retry?: number
}

/** Format an SSE message string. */
function formatSSE(msg: SSEMessage): string {
	let result = ''
	if (msg.event) result += `event: ${msg.event}\n`
	if (msg.id !== undefined) result += `id: ${msg.id}\n`
	if (msg.retry !== undefined) result += `retry: ${msg.retry}\n`
	if (msg.data !== undefined) {
		const payload = typeof msg.data === 'string' ? msg.data : JSON.stringify(msg.data)
		for (const line of payload.split('\n')) {
			result += `data: ${line}\n`
		}
	}
	result += '\n'
	return result
}
