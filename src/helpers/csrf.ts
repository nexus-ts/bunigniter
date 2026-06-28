/**
 * CSRF middleware — Cross-Site Request Forgery protection.
 *
 * Uses HMAC-SHA256 via node:crypto (works in Bun and Node test environments).
 * In production, runs on Bun.
 *
 * @example
 * ```ts
 * import { Elysia } from 'elysia'
 * import { csrfMiddleware } from 'bunigniter/helpers/csrf'
 *
 * const app = new Elysia()
 *   .use(csrfMiddleware())
 * ```
 */

import { createHmac, randomUUID } from "node:crypto"
import { Elysia } from "elysia"
import { env } from "./env"

export interface CSRFOptions {
	secret?: string
	cookieName?: string
	headerName?: string
	formField?: string
	protectedMethods?: string[]
	exclude?: string[]
}

/** Generate CSRF token: base64(timestamp.random.HMAC-SHA256-signature) */
function generateToken(secret: string): string {
	const random = randomUUID().replace(/-/g, "")
	const timestamp = Math.floor(Date.now() / 1000).toString(16)
	const payload = `${timestamp}.${random}`
	const sig = createHmac("sha256", secret).update(payload).digest("hex").slice(0, 16)
	return Buffer.from(`${payload}.${sig}`).toString("base64url")
}

/** Verify CSRF token. */
function verifyToken(token: string, secret: string): boolean {
	try {
		const decoded = Buffer.from(token, "base64url").toString("utf-8")
		const parts = decoded.split(".")
		if (parts.length !== 3) return false
		const [timestamp, random, sig] = parts
		const payload = `${timestamp}.${random}`
		const expected = createHmac("sha256", secret).update(payload).digest("hex").slice(0, 16)
		// Constant-time compare
		if (sig.length !== expected.length) return false
		let result = 0
		for (let i = 0; i < sig.length; i++) {
			result |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
		}
		return result === 0
	} catch {
		return false
	}
}

/**
 * Create CSRF middleware for Elysia v2.
 *
 * Uses `derive('global')` to inject csrfToken + csrf.validate() into every request.
 * Uses `beforeHandle('global')` to set CSRF cookie on every response.
 */
export function csrfMiddleware(options: CSRFOptions = {}) {
	const secret = options.secret ?? env("APP_KEY", "bunigniter-csrf")
	const cookieName = options.cookieName ?? "XSRF-TOKEN"
	const headerName = options.headerName ?? "X-CSRF-Token"
	const formField = options.formField ?? "_csrf"
	const protectedMethods = options.protectedMethods ?? ["POST", "PUT", "PATCH", "DELETE"]
	const exclude = options.exclude ?? []

	return new Elysia({ name: "bunigniter-csrf" })
		.derive("global", ({ request, cookie: cookieJar }: any) => {
			const csrfToken = generateToken(secret)
			const cookieToken = cookieJar?.[cookieName]?.value

			return {
				csrfToken,
				csrf: {
					token: () => csrfToken,
					validate: (req?: Request) => {
						const r = req ?? request
						const url = new URL(r.url)
						const path = url.pathname

						if (exclude.some((s) => path.startsWith(s))) return true
						if (!protectedMethods.includes(r.method)) return true

						let tokenValue = r.headers.get(headerName)
						if (!tokenValue) {
							tokenValue = url.searchParams.get(formField) ?? undefined
						}

						if (tokenValue && verifyToken(tokenValue, secret)) return true
						if (cookieToken && verifyToken(cookieToken, secret)) return true

						return false
					},
				},
			}
		})
		.beforeHandle("global", ({ set, csrfToken }: any) => {
			if (csrfToken) {
				set.headers = set.headers || {}
				set.headers["set-cookie"] = `${cookieName}=${csrfToken}; Path=/; SameSite=Lax`
			}
		})
}
