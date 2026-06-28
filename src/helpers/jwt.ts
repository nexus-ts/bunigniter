/**
 * JWT — simple JSON Web Token helper for API authentication.
 *
 * @example
 * ```ts
 * // Generate a token
 * const token = jwt.sign({ userId: 1, role: 'admin' }, 'secret-key')
 *
 * // Verify a token
 * const payload = jwt.verify(token, 'secret-key')
 * // → { userId: 1, role: 'admin', iat: ..., exp: ... }
 * ```
 */
import { env } from "./env"

export interface JwtConfig {
	/** HMAC secret key. Default: APP_KEY */
	secret?: string

	/** Token expiration in seconds. Default: 3600 (1 hour) */
	expiresIn?: number

	/** Issuer claim. */
	issuer?: string
}

export interface JwtPayload {
	[key: string]: any
	iat: number
	exp: number
	iss?: string
}

const defaults: JwtConfig = {
	secret: env("APP_KEY", "dev-jwt-secret"),
	expiresIn: 3600,
}

/**
 * JWT helper with sign/verify.
 *
 * @example
 * ```ts
 * import { jwt } from 'bunigniter/helpers/jwt'
 *
 * // Login endpoint
 * const token = jwt.sign({ userId: user.id, role: user.role })
 * return this.json({ token })
 *
 * // In middleware, verify:
 * const payload = jwt.verify(tokenFromHeader)
 * // → { userId: 1, role: 'admin', iat: ..., exp: ... }
 * ```
 */
export const jwt = {
	/**
	 * Create a signed JWT token.
	 * Payload is automatically enriched with iat (issued at) and exp (expiration).
	 */
	sign(payload: Record<string, any>, config?: JwtConfig): string {
		const cfg = { ...defaults, ...config }
		const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }))
		const now = Math.floor(Date.now() / 1000)
		const fullPayload = {
			...payload,
			iat: now,
			exp: now + (cfg.expiresIn ?? 3600),
			...(cfg.issuer ? { iss: cfg.issuer } : {}),
		}
		const payloadStr = base64UrlEncode(JSON.stringify(fullPayload))
		const signature = createSignature(`${header}.${payloadStr}`, cfg.secret!)
		return `${header}.${payloadStr}.${signature}`
	},

	/**
	 * Verify and decode a JWT token.
	 * Returns the payload if valid, throws if expired or invalid signature.
	 */
	verify(token: string, config?: JwtConfig): JwtPayload {
		const cfg = { ...defaults, ...config }
		const parts = token.split(".")
		if (parts.length !== 3) throw new Error("Invalid JWT format")

		const [, payloadB64, signature] = parts
		const expected = createSignature(`${parts[0]}.${parts[1]}`, cfg.secret!)
		if (signature !== expected) throw new Error("Invalid JWT signature")

		const payload = JSON.parse(base64UrlDecode(payloadB64))
		const now = Math.floor(Date.now() / 1000)
		if (payload.exp && payload.exp < now) throw new Error("JWT expired")
		if (payload.nbf && payload.nbf > now) throw new Error("JWT not yet valid")

		return payload
	},

	/**
	 * Extract Bearer token from Authorization header.
	 * Returns null if no valid Bearer token found.
	 */
	fromHeader(authHeader?: string): string | null {
		if (!authHeader) return null
		const match = authHeader.match(/^Bearer\s+(.+)$/i)
		return match?.[1] ?? null
	},
}

/** JWT middleware factory — protects routes with JWT. */
export function jwtMiddleware(config?: JwtConfig) {
	const cfg = { ...defaults, ...config }

	return async (c: any, next: any) => {
		const authHeader = c.request?.headers?.get("authorization")
		const token = jwt.fromHeader(authHeader)

		if (!token) {
			return new Response(JSON.stringify({ error: "Missing authorization header" }), {
				status: 401,
				headers: { "content-type": "application/json" },
			})
		}

		try {
			const payload = jwt.verify(token, cfg)
			c.jwt = payload
			c.user = payload
			await next()
		} catch (e: any) {
			return new Response(JSON.stringify({ error: e.message ?? "Invalid token" }), {
				status: 401,
				headers: { "content-type": "application/json" },
			})
		}
	}
}

function createSignature(data: string, secret: string): string {
	const { createHmac } = require("node:crypto")
	return createHmac("sha256", secret).update(data).digest("base64url")
}

function base64UrlEncode(s: string): string {
	return Buffer.from(s).toString("base64url")
}

function base64UrlDecode(s: string): string {
	return Buffer.from(s, "base64url").toString("utf-8")
}
