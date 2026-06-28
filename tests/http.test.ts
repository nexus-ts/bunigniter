/**
 * Tests for HTTP client helper.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock fetch globally
const mockFetch = vi.fn()
globalThis.fetch = mockFetch as any

// Import after mock
import { HttpClient } from "../src/helpers/http"

describe("HttpClient", () => {
	beforeEach(() => {
		mockFetch.mockReset()
	})

	it("makes GET request and parses JSON", async () => {
		mockFetch.mockResolvedValue(
			new Response(JSON.stringify({ data: "ok" }), {
				status: 200,
				headers: { "content-type": "application/json" },
			}),
		)

		const http = new HttpClient()
		const res = await http.get("https://api.example.com/test")
		expect(res.status).toBe(200)
		expect(res.data).toEqual({ data: "ok" })
	})

	it("makes POST request with JSON body", async () => {
		mockFetch.mockResolvedValue(
			new Response(JSON.stringify({ id: 1 }), {
				status: 201,
				headers: { "content-type": "application/json" },
			}),
		)

		const http = new HttpClient()
		const res = await http.post("https://api.example.com/users", { name: "Alice" })
		expect(res.status).toBe(201)
		expect(res.data).toEqual({ id: 1 })

		const call = mockFetch.mock.calls[0]
		const body = JSON.parse(call[1].body)
		expect(body.name).toBe("Alice")
	})

	it("handles non-JSON responses as text", async () => {
		mockFetch.mockResolvedValue(
			new Response("plain text", {
				status: 200,
				headers: { "content-type": "text/plain" },
			}),
		)

		const http = new HttpClient()
		const res = await http.get("https://api.example.com/text")
		expect(res.data).toBe("plain text")
	})

	it("sets Authorization header for Bearer auth", async () => {
		mockFetch.mockResolvedValue(new Response("ok", { status: 200 }))

		const http = new HttpClient()
		await http.get("https://api.example.com/secure", { auth: "mytoken" })
		const headers = mockFetch.mock.calls[0][1].headers
		expect(headers.authorization).toBe("Bearer mytoken")
	})
})
