/**
 * WebSocket — simple real-time communication.
 *
 * @example
 * ```ts
 * // routes/ws.ts — define WebSocket handlers per room/topic
 * import { ws } from '@nexusts/core/helpers/ws'
 *
 * // Echo server
 * ws.handle('/ws/echo', {
 *   open(ws) { console.log('connected') },
 *   message(ws, data) { ws.send('echo: ' + data) },
 *   close(ws) { console.log('disconnected') },
 * })
 *
 * // Chat room
 * ws.handle('/ws/chat', {
 *   message(ws, data) {
 *     ws.publish('chat', JSON.stringify({ user: ws.id, msg: data }))
 *   },
 * })
 * ```
 */
import { Elysia } from 'elysia'

type WSHandler = {
	open?: (ws: any) => void
	message?: (ws: any, data: any) => void
	close?: (ws: any) => void
	drain?: (ws: any) => void
}

type WSOptions = {
	/** Schema for incoming messages (validated by Elysia). */
	body?: any
	/** Schema for outgoing messages. */
	response?: any
}

class WSManager {
	private app: any = null
	private handlers: Map<string, WSHandler> = new Map()
	private options: Map<string, WSOptions> = new Map()

	/**
	 * Register a WebSocket handler for a path.
	 *
	 * @param path - WebSocket endpoint path (e.g. '/ws/chat')
	 * @param handler - Event handlers
	 * @param options - Optional schema config
	 */
	handle(path: string, handler: WSHandler, options?: WSOptions): void {
		this.handlers.set(path, handler)
		if (options) this.options.set(path, options)
	}

	/**
	 * Get the Elysia WS config object for a path.
	 * Called internally during app initialization.
	 */
	getConfig(path: string): any {
		const handler = this.handlers.get(path)
		if (!handler) return null

		const config: any = {}
		if (handler.open) config.open = handler.open
		if (handler.drain) config.drain = handler.drain
		if (handler.close) handler.close

		if (handler.message) {
			config.message = handler.message
		}

		const opts = this.options.get(path)
		if (opts?.body) config.body = opts.body
		if (opts?.response) config.response = opts.response

		return config
	}

	/** Get all registered WS paths. */
	get paths(): string[] {
		return [...this.handlers.keys()]
	}

	/**
	 * Mount all registered WebSocket handlers onto an Elysia app.
	 * Called automatically by the framework.
	 */
	mount(app: any): void {
		for (const [path, handler] of this.handlers) {
			const opts = this.options.get(path) ?? {}
			const config: any = {}

			if (handler.open) config.open = handler.open
			if (handler.message) config.message = handler.message
			if (handler.close) config.close = handler.close
			if (handler.drain) config.drain = handler.drain
			if (opts.body) config.body = opts.body
			if (opts.response) config.response = opts.response

			// Elysia v2: app.ws(path, options) or app.ws(path, handler)
			// If there's only a message handler, use the 2-arg form
			if (handler.open || handler.close || handler.drain || opts.body || opts.response) {
				;(app as any).ws(path, config)
			} else {
				;(app as any).ws(path, handler.message!)
			}

			console.log(`[ws] ${path}`)
		}
	}
}

/** Singleton WS manager. */
export const ws = new WSManager()

/** Broadcast a message to all clients in a room. */
export function broadcast(room: string, message: string): void {
	// Elysia handles room broadcast via ws.publish
	// This function is a placeholder for server-level broadcast
	console.log(`[ws] broadcast to ${room}: ${message}`)
}
