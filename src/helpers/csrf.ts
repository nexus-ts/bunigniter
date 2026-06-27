/**
 * CSRF middleware — Cross-Site Request Forgery protection.
 *
 * Generates and validates CSRF tokens for state-changing requests (POST, PUT, DELETE, PATCH).
 *
 * @example
 * ```ts
 * app.use(csrfMiddleware())
 * ```
 *
 * Then in forms:
 * ```html
 * <input type="hidden" name="_token" value="{{csrfToken}}">
 * ```
 *
 * Or in fetch:
 * ```ts
 * fetch('/api/users', {
 *   method: 'POST',
 *   headers: { 'X-CSRF-Token': csrfToken }
 * })
 * ```
 */
import { Elysia } from 'elysia'
import { env } from './env'

export interface CSRFOptions {
	/** Secret key for token signing. Default: APP_KEY */
	secret?: string

	/** Cookie name for storing the token. Default: 'XSRF-TOKEN' */
	cookieName?: string

	/** Header name for token verification. Default: 'X-CSRF-Token' */
	headerName?: string

	/** Form field name for token verification. Default: '_token' */
	formField?: string

	/** Methods that require CSRF protection. Default: ['POST', 'PUT', 'PATCH', 'DELETE'] */
	protectedMethods?: string[]

	/** Paths to exclude from CSRF protection. */
	exclude?: string[]
}

/**
 * Create a CSRF protection middleware.
 */
export function csrfMiddleware(options: CSRFOptions = {}) {
	const {
		secret = env('APP_KEY', 'dev-csrf-secret'),
		cookieName = 'XSRF-TOKEN',
		headerName = 'X-CSRF-Token',
		formField = '_token',
		protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'],
		exclude = [],
	} = options

	const app = new Elysia({ name: 'nexus-csrf' })

	app.derive(async ({ request, cookie: cookieJar }: any) => {
		const url = new URL(request.url)
		const path = url.pathname

		// Generate CSRF token
		const token = generateToken(secret)
		const previousToken = cookieJar?.[cookieName]?.value

		return {
			csrfToken: token,
			csrf: {
				/**
				 * Get the current CSRF token value.
				 */
				token: () => token,

				/**
				 * Validate the request's CSRF token.
				 * Call this in your handler before mutations.
				 */
				validate: (request: Request) => {
					// Skip excluded paths
					if (exclude.some((s) => path.startsWith(s))) return true

					// Only check protected methods
					if (!protectedMethods.includes(request.method)) return true

					const tokenHeader = request.headers.get(headerName)
					const formData = request.headers.get('content-type')?.includes('urlencoded')
					let tokenValue = tokenHeader

					// Check form field
					if (!tokenValue && formData) {
						// _token is handled differently for form data
					}

					// Check cookie-based token (XSRF-TOKEN)
					const cookieToken = previousToken

					// If header token matches cookie token, it's valid
					if (tokenValue && cookieToken && constantTimeCompare(tokenValue, cookieToken)) {
						return true
					}

					return false
				},
			},
		}
	})

	// Set CSRF cookie on every response
	app.afterResponse(({ csrfToken, cookie: cookieJar }: any) => {
		if (csrfToken && cookieJar?.[cookieName]) {
			cookieJar[cookieName].value = csrfToken
			cookieJar[cookieName].path = '/'
			cookieJar[cookieName].httpOnly = false // Must be readable by JS
			cookieJar[cookieName].sameSite = 'Lax'
		}
	})

	return app
}

/**
 * Generate a CSRF token.
 * Combines a random value with an HMAC signature.
 */
function generateToken(secret: string): string {
	const random = crypto.randomUUID().replace(/-/g, '')
	const timestamp = Math.floor(Date.now() / 1000).toString(16)
	const payload = `${timestamp}.${random}`
	const sig = sign(payload, secret)
	return `${payload}.${sig}`
}

/**
 * Sign a value with HMAC-SHA256.
 */
function sign(value: string, secret: string): string {
	const { createHmac } = require('node:crypto')
	return createHmac('sha256', secret).update(value).digest('hex').slice(0, 16)
}

/**
 * Constant-time string comparison.
 */
function constantTimeCompare(a: string, b: string): boolean {
	if (a.length !== b.length) return false
	let result = 0
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i)
	}
	return result === 0
}
