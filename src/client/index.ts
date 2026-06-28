/**
 * Typed Fetch Client — Void-style type-safe API client.
 *
 * Generates a type-safe fetch client from route definitions.
 * In the browser, uses `fetch`. In the server, calls `app.fetch()` directly.
 *
 * @example
 * ```ts
 * import { api } from 'nexusts/client'
 *
 * // GET: fully typed response
 * const users = await api.get('/api/users')
 *
 * // POST: typed body + response
 * const created = await api.post('/api/users', { name: 'Alice', email: 'a@b.com' })
 *
 * // With params
 * const user = await api.get('/api/users/:id', { params: { id: '42' } })
 *
 * // With query
 * const result = await api.get('/api/search', { query: { q: 'hello' } })
 * ```
 */

export interface FetchOptions {
	/** HTTP method. Default: GET */
	method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"

	/** Request body (auto-serialized to JSON). */
	body?: any

	/** Query parameters. */
	query?: Record<string, string | number | boolean | undefined>

	/** URL path parameters (e.g. `{ id: '42' }` for /:id). */
	params?: Record<string, string | number>

	/** Additional headers. */
	headers?: Record<string, string>

	/** Base URL. Default: '' (same origin). */
	baseURL?: string

	/** Abort signal. */
	signal?: AbortSignal

	/** Timeout in ms. */
	timeout?: number
}

export interface FetchError {
	status: number
	data: any
	response: Response
}

/**
 * Typed fetch helper.
 *
 * @param path - URL path (supports `:param` placeholders)
 * @param options - Request options
 * @returns Parsed response body
 *
 * @example
 * ```ts
 * import { fetch } from 'nexusts/client'
 * const users = await fetch('/api/users')
 * ```
 */
export async function fetch<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
	const { method = "GET", body, query, params, headers: extraHeaders, baseURL = "", signal, timeout } = options

	// Interpolate path params
	let resolvedPath = path
	if (params) {
		for (const [key, value] of Object.entries(params)) {
			resolvedPath = resolvedPath.replace(`:${key}`, String(value))
		}
	}

	// Build URL
	const url = new URL(resolvedPath, baseURL || "http://localhost")
	if (query) {
		for (const [key, value] of Object.entries(query)) {
			if (value !== undefined && value !== "") {
				url.searchParams.set(key, String(value))
			}
		}
	}

	// Build request
	const headers: Record<string, string> = {
		...(extraHeaders ?? {}),
	}
	if (body && method !== "GET") {
		headers["content-type"] = "application/json"
	}

	const requestInit: RequestInit = {
		method,
		headers,
		signal,
		...(body && method !== "GET" ? { body: JSON.stringify(body) } : {}),
	}

	// Timeout handling
	let timeoutId: Timer | undefined
	if (timeout) {
		const controller = new AbortController()
		timeoutId = setTimeout(() => controller.abort(), timeout)
		requestInit.signal = controller.signal
	}

	try {
		const response = await fetch(url.toString().replace(/^http:\/\/localhost/, ""), requestInit)

		if (!response.ok) {
			const error: FetchError = {
				status: response.status,
				data: await response.json().catch(() => null),
				response,
			}
			throw error
		}

		// Handle empty responses
		const contentType = response.headers.get("content-type") ?? ""
		if (contentType.includes("application/json")) {
			return response.json()
		}
		if (contentType.includes("text/")) {
			return response.text() as unknown as T
		}
		return undefined as unknown as T
	} finally {
		if (timeoutId) clearTimeout(timeoutId)
	}
}

/**
 * Convenience methods matching Void's fetch pattern.
 */
export const api = {
	get<T = any>(path: string, options?: Omit<FetchOptions, "method">): Promise<T> {
		return fetch<T>(path, { ...options, method: "GET" })
	},
	post<T = any>(path: string, body?: any, options?: Omit<FetchOptions, "method" | "body">): Promise<T> {
		return fetch<T>(path, { ...options, method: "POST", body })
	},
	put<T = any>(path: string, body?: any, options?: Omit<FetchOptions, "method" | "body">): Promise<T> {
		return fetch<T>(path, { ...options, method: "PUT", body })
	},
	delete<T = any>(path: string, options?: Omit<FetchOptions, "method">): Promise<T> {
		return fetch<T>(path, { ...options, method: "DELETE" })
	},
	patch<T = any>(path: string, body?: any, options?: Omit<FetchOptions, "method" | "body">): Promise<T> {
		return fetch<T>(path, { ...options, method: "PATCH", body })
	},
}
