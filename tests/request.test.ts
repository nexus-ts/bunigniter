/**
 * Unit tests for Request proxy.
 */
import { describe, expect, it } from "vitest"
import { RequestProxy } from "../src/helpers/request"

/** Create a minimal Elysia-like Context mock. */
function mockCtx(overrides: Record<string, any> = {}): any {
	const headers: Record<string, string | undefined> = {
		"content-type": "application/json",
		"x-requested-with": overrides.ajax ? "XMLHttpRequest" : undefined,
		authorization: overrides.token ? `Bearer ${overrides.token}` : undefined,
		"user-agent": overrides.userAgent ?? "TestAgent/1.0",
		...overrides.headers,
	}

	// Remove undefined headers
	for (const k of Object.keys(headers)) {
		if (headers[k] === undefined) delete headers[k]
	}

	const url = overrides.url ?? "http://localhost/api/test"

	return {
		body: overrides.body ?? { name: "Alice", email: "alice@test.com" },
		query: overrides.query ?? { page: "1", limit: "10" },
		params: overrides.params ?? {},
		headers,
		cookie: overrides.cookie ?? {},
		request: {
			method: overrides.method ?? "POST",
			url,
			headers: new Headers(headers as Record<string, string>),
		},
		server: overrides.server ?? null,
		...overrides.extra,
	}
}

describe("RequestProxy", () => {
	// ─── Phase 1: MVP ───────────────────────────────────────

	describe("input()", () => {
		it("returns body value when key exists in POST", () => {
			const proxy = new RequestProxy(mockCtx({ body: { name: "Alice" } }))
			expect(proxy.input("name")).toBe("Alice")
		})

		it("returns query value as fallback when key missing in body", () => {
			const proxy = new RequestProxy(
				mockCtx({
					body: { name: "Alice" },
					query: { page: "2" },
				}),
			)
			expect(proxy.input("page")).toBe("2")
		})

		it("returns body over query (POST priority)", () => {
			const proxy = new RequestProxy(
				mockCtx({
					body: { name: "Alice" },
					query: { name: "Bob" },
				}),
			)
			expect(proxy.input("name")).toBe("Alice")
		})

		it("returns default when key is missing", () => {
			const proxy = new RequestProxy(mockCtx({ body: {} }))
			expect(proxy.input("missing", "fallback")).toBe("fallback")
		})

		it("returns undefined when key is missing and no default", () => {
			const proxy = new RequestProxy(mockCtx({ body: {} }))
			expect(proxy.input("missing")).toBeUndefined()
		})

		it("returns merged body+query when called without key", () => {
			const proxy = new RequestProxy(
				mockCtx({
					body: { name: "Alice" },
					query: { page: "1" },
				}),
			)
			const all = proxy.input()
			expect(all).toHaveProperty("name", "Alice")
			expect(all).toHaveProperty("page", "1")
		})

		it("supports dot-notation for nested keys", () => {
			const proxy = new RequestProxy(
				mockCtx({
					body: { user: { profile: { age: 30 } } },
				}),
			)
			expect(proxy.input("user.profile.age")).toBe(30)
		})
	})

	describe("get()", () => {
		it("returns query param by key", () => {
			const proxy = new RequestProxy(mockCtx({ query: { page: "1" } }))
			expect(proxy.get("page")).toBe("1")
		})

		it("does NOT fall back to body", () => {
			const proxy = new RequestProxy(
				mockCtx({
					body: { name: "Alice" },
					query: {},
				}),
			)
			expect(proxy.get("name")).toBeUndefined()
		})

		it("returns all query when called without key", () => {
			const proxy = new RequestProxy(mockCtx({ query: { page: "1", limit: "10" } }))
			expect(proxy.get()).toEqual({ page: "1", limit: "10" })
		})

		it("returns default when key is missing", () => {
			const proxy = new RequestProxy(mockCtx({ query: {} }))
			expect(proxy.get("missing", 42)).toBe(42)
		})
	})

	describe("post()", () => {
		it("returns body value by key", () => {
			const proxy = new RequestProxy(mockCtx({ body: { email: "a@b.com" } }))
			expect(proxy.post("email")).toBe("a@b.com")
		})

		it("does NOT fall back to query", () => {
			const proxy = new RequestProxy(
				mockCtx({
					body: {},
					query: { email: "q@b.com" },
				}),
			)
			expect(proxy.post("email")).toBeUndefined()
		})

		it("returns all body when called without key", () => {
			const proxy = new RequestProxy(mockCtx({ body: { a: 1, b: 2 } }))
			expect(proxy.post()).toEqual({ a: 1, b: 2 })
		})
	})

	describe("only()", () => {
		it("extracts specified keys from body+query", () => {
			const proxy = new RequestProxy(
				mockCtx({
					body: { name: "Alice", email: "a@b.com" },
					query: { page: "1" },
				}),
			)
			expect(proxy.only(["name", "email"])).toEqual({
				name: "Alice",
				email: "a@b.com",
			})
		})

		it("excludes unspecified keys", () => {
			const proxy = new RequestProxy(
				mockCtx({
					body: { name: "Alice", password: "secret" },
				}),
			)
			const result = proxy.only(["name"])
			expect(result).toEqual({ name: "Alice" })
			expect(result).not.toHaveProperty("password")
		})
	})

	describe("has()", () => {
		it("returns true when key exists in body", () => {
			const proxy = new RequestProxy(mockCtx({ body: { name: "Alice" } }))
			expect(proxy.has("name")).toBe(true)
		})

		it("returns true when key exists in query", () => {
			const proxy = new RequestProxy(
				mockCtx({
					body: {},
					query: { page: "1" },
				}),
			)
			expect(proxy.has("page")).toBe(true)
		})

		it("returns false when key is missing", () => {
			const proxy = new RequestProxy(mockCtx({ body: {} }))
			expect(proxy.has("missing")).toBe(false)
		})
	})

	describe("filled()", () => {
		it("returns true for non-empty value", () => {
			const proxy = new RequestProxy(mockCtx({ body: { name: "Alice" } }))
			expect(proxy.filled("name")).toBe(true)
		})

		it("returns false for empty string", () => {
			const proxy = new RequestProxy(mockCtx({ body: { name: "" } }))
			expect(proxy.filled("name")).toBe(false)
		})

		it("returns false for null", () => {
			const proxy = new RequestProxy(mockCtx({ body: { name: null } }))
			expect(proxy.filled("name")).toBe(false)
		})

		it("returns false for undefined", () => {
			const proxy = new RequestProxy(mockCtx({ body: { name: undefined } }))
			expect(proxy.filled("name")).toBe(false)
		})

		it("returns false for missing key", () => {
			const proxy = new RequestProxy(mockCtx({ body: {} }))
			expect(proxy.filled("missing")).toBe(false)
		})
	})

	describe("method()", () => {
		it("returns GET", () => {
			const proxy = new RequestProxy(mockCtx({ method: "GET" }))
			expect(proxy.method()).toBe("GET")
		})

		it("returns POST", () => {
			const proxy = new RequestProxy(mockCtx({ method: "POST" }))
			expect(proxy.method()).toBe("POST")
		})

		it("returns PUT", () => {
			const proxy = new RequestProxy(mockCtx({ method: "PUT" }))
			expect(proxy.method()).toBe("PUT")
		})

		it("returns DELETE", () => {
			const proxy = new RequestProxy(mockCtx({ method: "DELETE" }))
			expect(proxy.method()).toBe("DELETE")
		})
	})

	describe("isAjax()", () => {
		it("returns true for X-Requested-With: XMLHttpRequest", () => {
			const proxy = new RequestProxy(mockCtx({ ajax: true }))
			expect(proxy.isAjax()).toBe(true)
		})

		it("returns false without AJAX header", () => {
			const proxy = new RequestProxy(mockCtx({}))
			expect(proxy.isAjax()).toBe(false)
		})
	})

	describe("ip()", () => {
		it("returns IP when server.requestIP is available", () => {
			const proxy = new RequestProxy(
				mockCtx({
					server: {
						requestIP: () => ({ address: "127.0.0.1" }),
					},
				}),
			)
			expect(proxy.ip()).toBe("127.0.0.1")
		})

		it("returns undefined when server is null", () => {
			const proxy = new RequestProxy(mockCtx({ server: null }))
			expect(proxy.ip()).toBeUndefined()
		})
	})

	// ─── Phase 2: Productivity ──────────────────────────────

	describe("boolean()", () => {
		it('returns true for "true"', () => {
			const proxy = new RequestProxy(mockCtx({ body: { active: "true" } }))
			expect(proxy.boolean("active")).toBe(true)
		})

		it('returns true for "1"', () => {
			const proxy = new RequestProxy(mockCtx({ body: { active: "1" } }))
			expect(proxy.boolean("active")).toBe(true)
		})

		it('returns true for "yes"', () => {
			const proxy = new RequestProxy(mockCtx({ body: { active: "yes" } }))
			expect(proxy.boolean("active")).toBe(true)
		})

		it('returns true for "on"', () => {
			const proxy = new RequestProxy(mockCtx({ body: { active: "on" } }))
			expect(proxy.boolean("active")).toBe(true)
		})

		it("returns true for actual boolean", () => {
			const proxy = new RequestProxy(mockCtx({ body: { active: true } }))
			expect(proxy.boolean("active")).toBe(true)
		})

		it('returns false for "false"', () => {
			const proxy = new RequestProxy(mockCtx({ body: { active: "false" } }))
			expect(proxy.boolean("active")).toBe(false)
		})

		it('returns false for "0"', () => {
			const proxy = new RequestProxy(mockCtx({ body: { active: "0" } }))
			expect(proxy.boolean("active")).toBe(false)
		})

		it("returns default when key is missing", () => {
			const proxy = new RequestProxy(mockCtx({ body: {} }))
			expect(proxy.boolean("active", true)).toBe(true)
		})

		it("returns false by default when key is missing", () => {
			const proxy = new RequestProxy(mockCtx({ body: {} }))
			expect(proxy.boolean("active")).toBe(false)
		})
	})

	describe("integer()", () => {
		it("parses numeric string", () => {
			const proxy = new RequestProxy(mockCtx({ body: { age: "25" } }))
			expect(proxy.integer("age")).toBe(25)
		})

		it("parses actual number", () => {
			const proxy = new RequestProxy(mockCtx({ body: { age: 25 } }))
			expect(proxy.integer("age")).toBe(25)
		})

		it("floors float values", () => {
			const proxy = new RequestProxy(mockCtx({ body: { age: 25.7 } }))
			expect(proxy.integer("age")).toBe(25)
		})

		it("returns default for non-numeric", () => {
			const proxy = new RequestProxy(mockCtx({ body: { age: "abc" } }))
			expect(proxy.integer("age", 10)).toBe(10)
		})

		it("returns 0 by default when key is missing", () => {
			const proxy = new RequestProxy(mockCtx({ body: {} }))
			expect(proxy.integer("age")).toBe(0)
		})
	})

	describe("json()", () => {
		it("returns full body when called without key", () => {
			const proxy = new RequestProxy(
				mockCtx({
					body: { user: { name: "Alice" } },
				}),
			)
			expect(proxy.json()).toEqual({ user: { name: "Alice" } })
		})

		it("supports dot-notation access", () => {
			const proxy = new RequestProxy(
				mockCtx({
					body: { user: { name: "Alice", profile: { age: 30 } } },
				}),
			)
			expect(proxy.json("user.name")).toBe("Alice")
			expect(proxy.json("user.profile.age")).toBe(30)
		})

		it("returns undefined for missing key", () => {
			const proxy = new RequestProxy(mockCtx({ body: {} }))
			expect(proxy.json("missing")).toBeUndefined()
		})

		it("returns undefined when body is primitive", () => {
			const proxy = new RequestProxy(mockCtx({ body: "raw string" }))
			expect(proxy.json()).toBeUndefined()
		})
	})

	describe("bearerToken()", () => {
		it("extracts Bearer token from Authorization header", () => {
			const proxy = new RequestProxy(mockCtx({ token: "my-token-123" }))
			expect(proxy.bearerToken()).toBe("my-token-123")
		})

		it("returns null when no Authorization header", () => {
			const proxy = new RequestProxy(mockCtx({}))
			expect(proxy.bearerToken()).toBeNull()
		})

		it("returns null for non-Bearer auth", () => {
			const proxy = new RequestProxy(
				mockCtx({
					headers: { authorization: "Basic dXNlcjpwYXNz" },
				}),
			)
			expect(proxy.bearerToken()).toBeNull()
		})
	})

	describe("userAgent()", () => {
		it("returns User-Agent string", () => {
			const proxy = new RequestProxy(mockCtx({ userAgent: "Chrome/120" }))
			expect(proxy.userAgent()).toBe("Chrome/120")
		})

		it("returns empty string when header is missing", () => {
			const proxy = new RequestProxy(
				mockCtx({
					headers: { "user-agent": undefined },
				}),
			)
			expect(proxy.userAgent()).toBe("")
		})
	})

	describe("cookie()", () => {
		it("returns cookie value by key", () => {
			const proxy = new RequestProxy(
				mockCtx({
					cookie: { theme: { value: "dark" } },
				}),
			)
			expect(proxy.cookie("theme")).toBe("dark")
		})

		it("returns default when cookie is missing", () => {
			const proxy = new RequestProxy(mockCtx({ cookie: {} }))
			expect(proxy.cookie("missing", "light")).toBe("light")
		})

		it("returns undefined when missing and no default", () => {
			const proxy = new RequestProxy(mockCtx({ cookie: {} }))
			expect(proxy.cookie("missing")).toBeUndefined()
		})
	})

	describe("server()", () => {
		it("returns REMOTE_ADDR from ip()", () => {
			const proxy = new RequestProxy(
				mockCtx({
					server: { requestIP: () => ({ address: "192.168.1.1" }) },
				}),
			)
			expect(proxy.server("REMOTE_ADDR")).toBe("192.168.1.1")
		})

		it("returns REQUEST_METHOD", () => {
			const proxy = new RequestProxy(mockCtx({ method: "PUT" }))
			expect(proxy.server("REQUEST_METHOD")).toBe("PUT")
		})

		it("returns HTTP_USER_AGENT", () => {
			const proxy = new RequestProxy(mockCtx({ userAgent: "Firefox/120" }))
			expect(proxy.server("HTTP_USER_AGENT")).toBe("Firefox/120")
		})

		it("returns SERVER_NAME from URL", () => {
			const proxy = new RequestProxy(mockCtx({ url: "http://example.com/api" }))
			expect(proxy.server("SERVER_NAME")).toBe("example.com")
		})

		it("returns QUERY_STRING", () => {
			const proxy = new RequestProxy(
				mockCtx({
					url: "http://localhost?page=1&q=hello",
				}),
			)
			expect(proxy.server("QUERY_STRING")).toContain("page=1")
			expect(proxy.server("QUERY_STRING")).toContain("q=hello")
		})

		it("maps HTTP_* keys to headers", () => {
			const proxy = new RequestProxy(
				mockCtx({
					headers: { "x-custom": "value123" },
				}),
			)
			expect(proxy.server("HTTP_X_CUSTOM")).toBe("value123")
		})
	})
})
