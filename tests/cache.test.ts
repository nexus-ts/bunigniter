/**
 * Tests for cache helper.
 */
import { describe, expect, it } from "vitest"
import { Cache } from "../src/helpers/cache"

describe("Cache", () => {
	it("stores and retrieves values", () => {
		const cache = new Cache()
		cache.set("key", "value")
		expect(cache.get("key")).toBe("value")
	})

	it("returns undefined for missing keys", () => {
		const cache = new Cache()
		expect(cache.get("nonexistent")).toBeUndefined()
	})

	it("deletes values", () => {
		const cache = new Cache()
		cache.set("key", "value")
		cache.delete("key")
		expect(cache.get("key")).toBeUndefined()
	})

	it("clears all values", () => {
		const cache = new Cache()
		cache.set("a", 1)
		cache.set("b", 2)
		cache.clear()
		expect(cache.get("a")).toBeUndefined()
		expect(cache.get("b")).toBeUndefined()
	})

	it("checks existence with has()", () => {
		const cache = new Cache()
		cache.set("key", "value")
		expect(cache.has("key")).toBe(true)
		expect(cache.has("nonexistent")).toBe(false)
	})

	it("expires entries after TTL", async () => {
		const cache = new Cache()
		cache.set("key", "value", 0) // 0 seconds = expired immediately
		await new Promise((r) => setTimeout(r, 10))
		expect(cache.get("key")).toBeUndefined()
	})

	it("increment and decrement", () => {
		const cache = new Cache()
		expect(cache.increment("counter")).toBe(1)
		expect(cache.increment("counter")).toBe(2)
		expect(cache.decrement("counter")).toBe(1)
	})

	it("remember() sets and returns callback value", async () => {
		const cache = new Cache()
		const val = await cache.remember("key", 60, async () => "computed")
		expect(val).toBe("computed")
		expect(cache.get("key")).toBe("computed")
	})
})
