/**
 * Unit tests for modules helper.
 */

import { Elysia } from "elysia"
import { describe, expect, it } from "vitest"
import { registerModules } from "../src/helpers/modules"

describe("registerModules", () => {
	it("handles missing modules directory gracefully", async () => {
		const app = new Elysia() as any
		// Should not throw when modules/ doesn't exist
		await expect(registerModules(app as any, {})).resolves.toBeUndefined()
	})
})
