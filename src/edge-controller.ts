/**
 * EdgeController — Lightweight base class for Cloudflare Workers / Edge runtimes.
 *
 * Unlike the Bun-native Controller, this version:
 * - Does NOT use node:fs or bun:sqlite
 * - Does NOT depend on session, cache, queue, upload, mail
 * - Works with D1, PostgreSQL, and other edge-compatible databases
 * - Uses web-standard APIs only
 *
 * @example
 * ```ts
 * import { EdgeController } from "bunigniter/edge"
 *
 * export class ItemsController extends EdgeController {
 *   async index() {
 *     const items = await this.db.query("SELECT * FROM items")
 *     return this.json(items)
 *   }
 * }
 * ```
 */
import type { DbClient } from "./db/drizzle"

export class EdgeController {
	/** Database client (D1, Postgres, etc.) — set by the router. */
	declare db: DbClient

	/** Elysia context — set by the router before each method call. */
	declare ctx: any

	/** Path parameters. */
	protected get params(): Record<string, string> {
		return this.ctx.params ?? {}
	}

	/** Request body (parsed JSON). */
	protected get body(): any {
		return this.ctx.body ?? {}
	}

	/** Query parameters. */
	protected get query(): Record<string, string | string[]> {
		return this.ctx.query ?? {}
	}

	/** Request headers. */
	protected get headers(): Record<string, string | string[]> {
		return this.ctx.headers ?? {}
	}

	// ─── Response Shortcuts ──────────────────────────────────

	/** Return JSON response. */
	protected json(data: any, status = 200): Response {
		return new Response(JSON.stringify(data), {
			status,
			headers: { "content-type": "application/json" },
		})
	}

	/** Return text response. */
	protected text(data: string, status = 200): Response {
		return new Response(data, {
			status,
			headers: { "content-type": "text/plain" },
		})
	}

	/** Return HTML response. */
	protected html(data: string, status = 200): Response {
		return new Response(data, {
			status,
			headers: { "content-type": "text/html" },
		})
	}

	/** Redirect to a URL. */
	protected redirect(url: string, status: 301 | 302 = 302): Response {
		return new Response(null, {
			status,
			headers: { location: url },
		})
	}

	/** Return 404. */
	protected notFound(message = "Not Found"): Response {
		return new Response(message, { status: 404 })
	}

	/** Return 400 with validation errors. */
	protected badRequest(errors?: any): Response {
		return this.json({ error: "Bad Request", details: errors ?? null }, 400)
	}

	/** Return 401. */
	protected unauthorized(message = "Unauthorized"): Response {
		return new Response(message, { status: 401 })
	}
}
