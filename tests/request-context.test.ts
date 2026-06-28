/**
 * Unit tests for request-context.
 */
import { describe, expect, it } from "vitest"
import { getRequestContext, setRequestContext } from "../src/helpers/request-context"

describe("request-context", () => {
	it("stores and retrieves context", () => {
		const ctx = { url: "/test", method: "GET" }
		setRequestContext(ctx)
		expect(getRequestContext()).toBe(ctx)
	})

	it("overwrites previous context", () => {
		setRequestContext({ old: true })
		setRequestContext({ new: true })
		expect(getRequestContext()).toEqual({ new: true })
	})

	it("returns null initially", () => {
		setRequestContext(null as any)
		expect(getRequestContext()).toBeNull()
	})
})
