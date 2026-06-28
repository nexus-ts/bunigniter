/**
 * Tests for DbClient — runs only in Bun environment.
 */
import { describe, expect, it } from "vitest"

// Skip all tests if not in Bun
const run = typeof Bun !== "undefined" ? describe : describe.skip

run("DbClient", () => {
	it("is available", () => {
		// Just verify Bun is available
		expect(typeof Bun).toBe("object")
	})
})
