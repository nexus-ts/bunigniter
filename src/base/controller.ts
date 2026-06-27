/**
 * Controller — CodeIgniter-style base class.
 *
 * Extend this to get `this.db`, `this.request`, `this.json()`, `this.view()`, `this.redirect()`.
 *
 * @example
 * ```ts
 * // pages/users.ts
 * export class Users extends Controller {
 *   async index() {
 *     const users = await this.db.query('SELECT * FROM users')
 *     return this.json(users)
 *   }
 * }
 * ```
 */
import type { Context } from 'elysia'
import type { DbClient } from '../db/drizzle'
import { validate, validateStringRules, validateZod, type ValidationResult, type ValidationErrors, type rules } from '../helpers/validator'
import type { z } from 'zod'
import type { Session } from '../helpers/session'

export class Controller {
	/** Active request context — set by the router before each handler call. */
	declare ctx: Context

	/** Database client. Configured via `app.use(DrizzleModule)`. */
	declare db: DbClient

	/** Session — cookie-based, `this.session.get/set/delete/clear`. */
	declare session: Session

	/** Auth — `this.auth.user()`, `this.auth.login()`, `this.auth.logout()`. */
	declare auth: {
		user: () => any
		login: (user: any) => void
		logout: () => void
		check: () => boolean
	}

	// ─── Request Shortcuts ───────────────────────────────────────

	/** URL query parameter. */
	protected get query(): Record<string, string | string[]> {
		return this.ctx.query ?? {}
	}

	/** Path parameter. */
	protected param(name: string): string | undefined {
		return (this.ctx.params as Record<string, string | undefined>)?.[name]
	}

	/** Request body (parsed JSON by Elysia). */
	protected get body(): any {
		return (this.ctx as any).body ?? {}
	}

	/** Request headers. */
	protected get headers(): Record<string, string | string[]> {
		return this.ctx.headers ?? {}
	}

	/** Raw Elysia context — escape hatch. */
	protected get ctx_raw(): Context {
		return this.ctx
	}

	// ─── Response Shortcuts ──────────────────────────────────────

	/** Return JSON response. */
	protected json(data: any, status = 200): Response {
		return new Response(JSON.stringify(data), {
			status,
			headers: { 'content-type': 'application/json' }
		})
	}

	/** Return text response. */
	protected text(data: string, status = 200): Response {
		return new Response(data, {
			status,
			headers: { 'content-type': 'text/plain' }
		})
	}

	/** Return HTML response. */
	protected html(data: string, status = 200): Response {
		return new Response(data, {
			status,
			headers: { 'content-type': 'text/html' }
		})
	}

	/** Redirect to a URL. */
	protected redirect(url: string, status: 301 | 302 = 302): Response {
		return new Response(null, {
			status,
			headers: { location: url }
		})
	}

	/** Return 404. */
	protected notFound(message = 'Not Found'): Response {
		return new Response(message, { status: 404 })
	}

	/** Return 401. */
	protected unauthorized(message = 'Unauthorized'): Response {
		return new Response(message, { status: 401 })
	}

	/** Return 400 with validation errors. */
	protected badRequest(errors?: any): Response {
		return this.json({ error: 'Bad Request', details: errors ?? null }, 400)
	}

	// ─── Validation Shortcuts ────────────────────────────────────

	/**
	 * Validate request body against rules or a Zod schema.
	 *
	 * @example
	 * ```ts
	 * // String rules (CodeIgniter style)
	 * const v = this.validate(this.body, {
	 *   name: 'required|min:2',
	 *   email: 'required|email',
	 * })
	 * if (v.fails()) return this.badRequest(v.errors())
	 *
	 * // Zod schema (TypeScript style)
	 * import { z } from 'zod'
	 * const v = this.validate(this.body, z.object({
	 *   name: z.string().min(2),
	 *   email: z.string().email(),
	 * }))
	 * ```
	 */
	protected validate<T extends Record<string, any>>(
		data: unknown,
		schemaOrRules: z.ZodSchema<T> | Record<string, string>
	): ValidationResult<T> {
		return validate(data as any, schemaOrRules as any)
	}
}
