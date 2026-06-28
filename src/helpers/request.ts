/**
 * Request — CodeIgniter-style request proxy for NexusTS.
 *
 * Wraps Elysia's Context to provide a familiar input API
 * inspired by CodeIgniter 3/4, Laravel, and AdonisJS.
 *
 * Usage in a Controller:
 * ```ts
 * this.request.input('name', 'guest')
 * this.request.only(['name', 'email'])
 * this.request.has('name')
 * this.request.isAjax()
 * this.request.ip()
 * ```
 */
import type { Context } from "elysia";

/** Dot-notation access to nested object properties. */
function getFrom(obj: any, key: string, defaultValue?: any): any {
	if (!key) return obj;
	const keys = key.split(".");
	let val = obj;
	for (const k of keys) {
		if (val === null || val === undefined) return defaultValue;
		val = val[k];
	}
	return val !== undefined ? val : defaultValue;
}

/**
 * Request proxy — wraps Elysia Context.
 *
 * Created fresh per-request inside the Controller `request` getter.
 * Does not cache anything; delegates to Context properties directly.
 */
export class RequestProxy {
	constructor(private ctx: Context) {}

	// ─── Phase 1: MVP ─────────────────────────────────────────

	/**
	 * Retrieve an input item from the request (POST + GET merged).
	 *
	 * POST takes priority over GET. Supports dot-notation for nested keys.
	 *
	 * @param key - Field name or dot-notation path. Omitting returns all input.
	 * @param defaultValue - Value to return if the key is not present.
	 *
	 * @example
	 * ```ts
	 * this.request.input('name', 'guest')
	 * this.request.input('user.email')
	 * this.request.input() // → { name: '...', page: '1' }
	 * ```
	 */
	input(key?: string, defaultValue?: any): any {
		if (key === undefined) {
			return { ...(this.ctx.body ?? {}), ...(this.ctx.query ?? {}) };
		}
		const body = this.ctx.body ?? {};
		const query = this.ctx.query ?? {};
		const fromBody = getFrom(body, key);
		return fromBody !== undefined
			? fromBody
			: getFrom(query, key, defaultValue);
	}

	/**
	 * Retrieve a query string item (GET).
	 *
	 * @param key - Field name or dot-notation path. Omitting returns all query params.
	 * @param defaultValue - Value to return if the key is not present.
	 *
	 * @example
	 * ```ts
	 * this.request.get('page', 1)
	 * this.request.get() // → { page: '1', limit: '10' }
	 * ```
	 */
	get(key?: string, defaultValue?: any): any {
		if (key === undefined) return this.ctx.query;
		return getFrom(this.ctx.query, key, defaultValue);
	}

	/**
	 * Retrieve a POST / body item.
	 *
	 * @param key - Field name or dot-notation path. Omitting returns full body.
	 * @param defaultValue - Value to return if the key is not present.
	 *
	 * @example
	 * ```ts
	 * this.request.post('name')
	 * this.request.post('user.email')
	 * this.request.post() // → { name: '...', email: '...' }
	 * ```
	 */
	post(key?: string, defaultValue?: any): any {
		if (key === undefined) return this.ctx.body;
		return getFrom(this.ctx.body, key, defaultValue);
	}

	/**
	 * Retrieve only the specified keys from input (mass-assignment protection).
	 *
	 * @param keys - Array of field names to extract.
	 *
	 * @example
	 * ```ts
	 * this.request.only(['name', 'email'])
	 * // → { name: '...', email: '...' }
	 * ```
	 */
	only(keys: string[]): Record<string, any> {
		const result: Record<string, any> = {};
		const data = { ...(this.ctx.body ?? {}), ...(this.ctx.query ?? {}) };
		for (const key of keys) {
			result[key] = getFrom(data, key);
		}
		return result;
	}

	/**
	 * Determine if the request contains a given key.
	 *
	 * @param key - Field name to check.
	 *
	 * @example
	 * ```ts
	 * if (this.request.has('email')) { ... }
	 * ```
	 */
	has(key: string): boolean {
		const data = { ...(this.ctx.body ?? {}), ...(this.ctx.query ?? {}) };
		return getFrom(data, key) !== undefined;
	}

	/**
	 * Determine if the request contains a non-empty value for a given key.
	 *
	 * @param key - Field name to check.
	 *
	 * @example
	 * ```ts
	 * if (this.request.filled('name')) { ... }
	 * ```
	 */
	filled(key: string): boolean {
		const data = { ...(this.ctx.body ?? {}), ...(this.ctx.query ?? {}) };
		const val = getFrom(data, key);
		return val !== undefined && val !== null && val !== "";
	}

	/**
	 * Get the HTTP method of the request (uppercase).
	 *
	 * @example
	 * ```ts
	 * if (this.request.method() === 'POST') { ... }
	 * ```
	 */
	method(): string {
		return this.ctx.request.method;
	}

	/**
	 * Determine if the request is an AJAX request.
	 *
	 * Checks the `X-Requested-With` header.
	 *
	 * @example
	 * ```ts
	 * if (this.request.isAjax()) { return this.json(data) }
	 * ```
	 */
	isAjax(): boolean {
		const header = this.ctx.headers["x-requested-with"];
		return (
			typeof header === "string" && header.toLowerCase() === "xmlhttprequest"
		);
	}

	/**
	 * Get the client IP address.
	 *
	 * Uses Bun's `server.requestIP()` when available.
	 *
	 * @example
	 * ```ts
	 * const ip = this.request.ip()
	 * ```
	 */
	ip(): string | undefined {
		try {
			const server = this.ctx.server as any;
			if (typeof server?.requestIP === "function") {
				const info = server.requestIP(this.ctx.request);
				return info?.address;
			}
		} catch {
			// Silently fall through
		}
		return undefined;
	}

	// ─── Phase 2: Productivity ────────────────────────────────

	/**
	 * Retrieve input as a boolean value.
	 *
	 * Returns `true` for: `'true'`, `'1'`, `'yes'`, `'on'`, `true`.
	 *
	 * @param key - Field name.
	 * @param defaultValue - Default when missing (default: `false`).
	 *
	 * @example
	 * ```ts
	 * this.request.boolean('active')     // true / false
	 * this.request.boolean('subscribe', true)
	 * ```
	 */
	boolean(key: string, defaultValue: boolean = false): boolean {
		const val = this.input(key);
		if (val === undefined || val === null) return defaultValue;
		if (typeof val === "boolean") return val;
		return ["true", "1", "yes", "on"].includes(String(val).toLowerCase());
	}

	/**
	 * Retrieve input as an integer value.
	 *
	 * @param key - Field name.
	 * @param defaultValue - Default when missing or NaN (default: `0`).
	 *
	 * @example
	 * ```ts
	 * this.request.integer('age')          // 25
	 * this.request.integer('page', 1)      // 1 (default)
	 * ```
	 */
	integer(key: string, defaultValue: number = 0): number {
		const val = this.input(key);
		if (val === undefined || val === null) return defaultValue;
		const num = Number(val);
		return Number.isNaN(num) ? defaultValue : Math.floor(num);
	}

	/**
	 * Retrieve the JSON body (or a specific key from it).
	 *
	 * Supports dot-notation for nested JSON access.
	 *
	 * @param key - Dot-notation key path. Omitting returns the full parsed body.
	 *
	 * @example
	 * ```ts
	 * this.request.json()                  // { user: { name: 'Alice' } }
	 * this.request.json('user.name')      // 'Alice'
	 * ```
	 */
	json(key?: string): any {
		const body = this.ctx.body;
		if (!body || typeof body !== "object") return undefined;
		if (key === undefined) return body;
		return getFrom(body, key);
	}

	/**
	 * Extract the Bearer token from the Authorization header.
	 *
	 * @returns The token string, or `null` if not present.
	 *
	 * @example
	 * ```ts
	 * const token = this.request.bearerToken()
	 * ```
	 */
	bearerToken(): string | null {
		const auth = this.ctx.headers["authorization"];
		if (!auth || typeof auth !== "string") return null;
		const match = auth.match(/^Bearer\s+(.+)$/i);
		return match ? match[1] : null;
	}

	/**
	 * Get the User-Agent string.
	 *
	 * @returns The User-Agent string, or empty string if not set.
	 *
	 * @example
	 * ```ts
	 * const ua = this.request.userAgent()
	 * ```
	 */
	userAgent(): string {
		const ua = this.ctx.headers["user-agent"];
		return typeof ua === "string" ? ua : "";
	}

	/**
	 * Retrieve a cookie value.
	 *
	 * @param key - Cookie name.
	 * @param defaultValue - Value to return if the cookie is not present.
	 *
	 * @example
	 * ```ts
	 * const theme = this.request.cookie('theme', 'light')
	 * ```
	 */
	cookie(key: string, defaultValue?: string): string | undefined {
		const cookieObj = this.ctx.cookie?.[key];
		if (!cookieObj) return defaultValue;
		const val = cookieObj.value;
		return val !== undefined && val !== null ? String(val) : defaultValue;
	}

	/**
	 * Retrieve a server / environment variable.
	 *
	 * Emulates PHP's `$_SERVER` using available Elysia/Bun APIs.
	 * Handles common keys: `REMOTE_ADDR`, `REQUEST_METHOD`,
	 * `HTTP_USER_AGENT`, `SERVER_NAME`, `SERVER_PORT`,
	 * `REQUEST_URI`, `QUERY_STRING`, and `HTTP_*` headers.
	 *
	 * @param key - Server variable name.
	 *
	 * @example
	 * ```ts
	 * this.request.server('REMOTE_ADDR')     // '::1'
	 * this.request.server('REQUEST_METHOD')  // 'POST'
	 * ```
	 */
	server(key: string): string | undefined {
		switch (key) {
			case "REMOTE_ADDR":
				return this.ip();
			case "REQUEST_METHOD":
				return this.method();
			case "HTTP_USER_AGENT":
				return this.userAgent();
			case "SERVER_NAME": {
				try {
					return new URL(this.ctx.request.url).hostname;
				} catch {
					return undefined;
				}
			}
			case "SERVER_PORT": {
				try {
					return String(new URL(this.ctx.request.url).port || "80");
				} catch {
					return undefined;
				}
			}
			case "REQUEST_URI":
				return this.ctx.request.url;
			case "QUERY_STRING": {
				try {
					return new URL(this.ctx.request.url).search.replace(/^\?/, "");
				} catch {
					return undefined;
				}
			}
			default: {
				// Handle HTTP_* keys → map to headers
				if (key.startsWith("HTTP_")) {
					const headerKey = key.slice(5).replace(/_/g, "-").toLowerCase();
					const header = this.ctx.headers[headerKey];
					return typeof header === "string" ? header : undefined;
				}
				return undefined;
			}
		}
	}
}
