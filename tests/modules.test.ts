/**
 * Unit tests for modules helper.
 */
import { describe, it, expect } from "vitest";
import { registerModules } from "../src/helpers/modules";
import { Elysia } from "elysia";

describe("registerModules", () => {
	it("handles missing modules directory gracefully", async () => {
		const app = new Elysia() as any;
		// Should not throw when modules/ doesn't exist
		await expect(registerModules(app as any, {})).resolves.toBeUndefined();
	});
});
