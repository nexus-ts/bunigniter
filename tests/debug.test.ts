/**
 * Unit tests for debug toolbar.
 */
import { describe, expect, it } from "vitest"
import { debugQuery, generateToolbar, getStore } from "../src/helpers/debug"

describe("debug", () => {
	it("getStore returns a store object for a ctx", () => {
		const ctx = { request: { url: "http://localhost/test" } }
		const store = getStore(ctx as any)
		expect(store).toBeDefined()
		expect(store.queries).toEqual([])
	})

	it("debugQuery adds to store", () => {
		const ctx = { request: { url: "http://localhost/test" } }
		const store = getStore(ctx as any)
		debugQuery(ctx as any, "SELECT * FROM users", 5, 10)
		expect(store.queries.length).toBe(1)
		expect(store.queries[0].sql).toBe("SELECT * FROM users")
		expect(store.queries[0].duration).toBe(5)
		expect(store.queries[0].rows).toBe(10)
	})

	it("different ctx gets different store", () => {
		const ctx1 = { request: { url: "http://localhost/a" } }
		const ctx2 = { request: { url: "http://localhost/b" } }
		debugQuery(ctx1 as any, "SELECT 1", 1, 1)
		const store1 = getStore(ctx1 as any)
		const store2 = getStore(ctx2 as any)
		expect(store1.queries.length).toBe(1)
		expect(store2.queries.length).toBe(0)
	})

	it("generateToolbar returns HTML string", async () => {
		const ctx = { request: { url: "http://localhost/test" } }
		const html = await generateToolbar(getStore(ctx as any))
		expect(typeof html).toBe("string")
		expect(html.length).toBeGreaterThan(0)
	})
})
