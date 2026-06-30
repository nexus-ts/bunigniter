/**
 * defineHandler — Void-style route handler with optional validation.
 *
 * Provides the same API as Void's `defineHandler` + `withValidator`.
 *
 * @example
 * ```ts
 * // routes/api/users.ts
 * import { defineHandler } from 'bunigniter'
 * import { db } from 'bunigniter/db'
 *
 * export const GET = defineHandler(async (c) => {
 *   return db.select().from(users)
 * })
 *
 * export const POST = defineHandler.withValidator({
 *   body: z.object({ name: z.string(), email: z.string().email() })
 * })(async (c, { body }) => {
 *   return db.insert(users).values(body).returning()
 * })
 * ```
 */
import type { Context } from "elysia"
import type { z } from "zod"
import type { ValidationErrors } from "./validator"

/** Handler function type. */
export type HandlerFn<T = any> = (c: Context, args?: T) => any

/** Validator config matching defineHandler.withValidator({ body, query, params }). */
export interface HandlerValidatorConfig {
	body?: z.ZodSchema
	query?: z.ZodSchema
	params?: z.ZodSchema
}

/** Wrapped handler with validated args. */
export type ValidatedHandler<T> = (c: Context, args: T) => any

/**
 * createHandler — wraps a function as a route handler.
 * Auto-converts return values to Response objects.
 */
function toResponse(result: any, c?: Context): Response {
	if (result instanceof Response) return result
	if (result === null || result === undefined) return new Response(null, { status: 204 })
	if (typeof result === "string") {
		return new Response(result, {
			headers: { "content-type": "text/html; charset=utf-8" },
		})
	}
	// object / array / number / boolean → JSON
	return new Response(JSON.stringify(result), {
		headers: { "content-type": "application/json" },
		...(c ? { status: (c as any).set?.status ?? 200 } : {}),
	})
}

/**
 * defineHandler — Void-style route handler factory.
 *
 * Usage:
 * ```ts
 * export const GET = defineHandler(async (c) => {
 *   return { users: await db.select().from(users) }
 * })
 * ```
 */
export function defineHandler<T extends HandlerFn>(fn: T): T {
	return ((c: Context) => {
		const result = fn(c)
		if (result instanceof Promise) {
			return result.then((r: any) => toResponse(r, c))
		}
		return toResponse(result, c)
	}) as unknown as T
}

/**
 * defineHandler.withValidator — handler with input validation.
 *
 * Usage:
 * ```ts
 * export const POST = defineHandler.withValidator({
 *   body: z.object({ name: z.string(), email: z.string().email() })
 * })(async (c, { body }) => {
 *   return db.insert(users).values(body).returning()
 * })
 * ```
 */
defineHandler.withValidator =
	<T extends ValidatedHandler<any>>(validators: HandlerValidatorConfig) =>
	(fn: T): HandlerFn =>
	async (c: Context) => {
		const errors: Record<string, ValidationErrors> = {}

		// Validate body (Elysia v2 puts parsed body on c.body)
		if (validators.body) {
			const body = (c as any).body ?? {}
			const result = validators.body.safeParse(body)
			if (!result.success) {
				errors.body = mapZodErrors(result.error)
			} else {
				;(c as any)._validatedBody = result.data
			}
		}

		// Validate query
		if (validators.query) {
			const query = Object.fromEntries(new URL(c.request.url).searchParams.entries())
			const result = validators.query.safeParse(query)
			if (!result.success) {
				errors.query = mapZodErrors(result.error)
			} else {
				;(c as any)._validatedQuery = result.data
			}
		}

		// Validate params
		if (validators.params) {
			const result = validators.params.safeParse((c as any).params ?? {})
			if (!result.success) {
				errors.params = mapZodErrors(result.error)
			}
		}

		if (Object.keys(errors).length > 0) {
			return new Response(
				JSON.stringify({
					error: "Validation failed",
					issues: errors,
				}),
				{
					status: 400,
					headers: { "content-type": "application/json" },
				},
			)
		}

		const result = await fn(c, {
			body: (c as any)._validatedBody,
			query: (c as any)._validatedQuery,
			params: (c as any).params,
		})
		return toResponse(result, c)
	}

/** Map Zod errors to our format. */
function mapZodErrors(error: any): ValidationErrors {
	const errors: ValidationErrors = {}
	for (const issue of error.issues ?? []) {
		const path = issue.path.join(".")
		;(errors[path] ??= []).push(issue.message)
	}
	return errors
}
