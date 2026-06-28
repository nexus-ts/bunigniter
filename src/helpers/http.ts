/**
 * HTTP Client — CodeIgniter-style HTTP request helper.
 *
 * @example
 * ```ts
 * // In a controller
 * const response = await this.http.get('https://api.github.com/repos/elysiajs/elysia')
 * console.log(response.data.stargazers_count)
 *
 * const res = await this.http.post('https://api.example.com/data', { key: 'value' })
 * ```
 */
export interface HttpOptions {
	/** Query parameters. */
	query?: Record<string, string | number | boolean>

	/** Request headers. */
	headers?: Record<string, string>

	/** Request timeout in ms. Default: 30000 */
	timeout?: number

	/** Base URL prepended to relative paths. */
	baseURL?: string

	/** Auth (basic): `username:password` or `token`. */
	auth?: { username: string; password: string } | string
}

export interface HttpResponse<T = any> {
	/** Response body (parsed JSON if applicable). */
	data: T

	/** HTTP status code. */
	status: number

	/** Response headers. */
	headers: Headers

	/** Was the request successful (2xx)? */
	ok: boolean

	/** Raw Response object. */
	raw: Response
}

/**
 * HTTP Client — convenience wrapper around fetch.
 */
export class HttpClient {
	private defaultOptions: HttpOptions = {}

	constructor(options: HttpOptions = {}) {
		this.defaultOptions = options
	}

	/**
	 * Send a GET request.
	 *
	 * @example
	 * ```ts
	 * const repos = await this.http.get('https://api.github.com/users/elysiajs/repos')
	 * ```
	 */
	async get<T = any>(url: string, options: HttpOptions = {}): Promise<HttpResponse<T>> {
		return this.request<T>("GET", url, undefined, options)
	}

	/**
	 * Send a POST request with JSON body.
	 *
	 * @example
	 * ```ts
	 * const result = await this.http.post('https://api.example.com/users', { name: 'Alice' })
	 * ```
	 */
	async post<T = any>(url: string, body?: any, options: HttpOptions = {}): Promise<HttpResponse<T>> {
		return this.request<T>("POST", url, body, options)
	}

	/**
	 * Send a PUT request.
	 */
	async put<T = any>(url: string, body?: any, options: HttpOptions = {}): Promise<HttpResponse<T>> {
		return this.request<T>("PUT", url, body, options)
	}

	/**
	 * Send a PATCH request.
	 */
	async patch<T = any>(url: string, body?: any, options: HttpOptions = {}): Promise<HttpResponse<T>> {
		return this.request<T>("PATCH", url, body, options)
	}

	/**
	 * Send a DELETE request.
	 */
	async delete<T = any>(url: string, options: HttpOptions = {}): Promise<HttpResponse<T>> {
		return this.request<T>("DELETE", url, undefined, options)
	}

	/**
	 * Low-level request method.
	 */
	async request<T = any>(method: string, url: string, body?: any, options: HttpOptions = {}): Promise<HttpResponse<T>> {
		const opts = { ...this.defaultOptions, ...options }

		// Build URL with query params
		let fullUrl = opts.baseURL ? `${opts.baseURL}${url}` : url
		if (opts.query) {
			const params = new URLSearchParams()
			for (const [k, v] of Object.entries(opts.query)) {
				params.set(k, String(v))
			}
			fullUrl += (fullUrl.includes("?") ? "&" : "?") + params.toString()
		}

		// Build headers
		const headers: Record<string, string> = { ...opts.headers }
		if (body && typeof body === "object" && !(body instanceof FormData)) {
			headers["content-type"] = "application/json"
		}

		// Auth
		if (opts.auth) {
			if (typeof opts.auth === "string") {
				headers.authorization = `Bearer ${opts.auth}`
			} else {
				const encoded = Buffer.from(`${opts.auth.username}:${opts.auth.password}`).toString("base64")
				headers.authorization = `Basic ${encoded}`
			}
		}

		// Build request
		const requestInit: RequestInit = {
			method,
			headers,
		}

		// Timeout
		let abortController: AbortController | undefined
		const timeout = opts.timeout ?? 30000
		if (timeout > 0) {
			abortController = new AbortController()
			requestInit.signal = abortController.signal
			setTimeout(() => abortController?.abort(), timeout)
		}

		if (body !== undefined) {
			requestInit.body = body instanceof FormData ? body : JSON.stringify(body)
		}

		try {
			const response = await fetch(fullUrl, requestInit)
			const contentType = response.headers.get("content-type") ?? ""
			let data: any

			if (contentType.includes("application/json")) {
				data = await response.json()
			} else if (contentType.includes("text/")) {
				data = await response.text()
			} else {
				data = await response.arrayBuffer()
			}

			return {
				data: data as T,
				status: response.status,
				headers: response.headers,
				ok: response.ok,
				raw: response,
			}
		} catch (err: any) {
			if (err.name === "AbortError") {
				throw new Error(`Request timed out after ${timeout}ms: ${method} ${fullUrl}`)
			}
			throw err
		} finally {
			if (abortController) clearTimeout(abortController as any)
		}
	}
}

// Singleton
let _httpInstance: HttpClient | null = null
export function createHttp(options?: HttpOptions): HttpClient {
	if (!_httpInstance) _httpInstance = new HttpClient(options)
	return _httpInstance
}
