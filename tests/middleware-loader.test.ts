/**
 * Unit tests for middleware-loader.
 */
import { describe, it, expect } from "vitest";
import {
	defineMiddleware,
	loadMiddleware,
} from "../src/helpers/middleware-loader";

describe("defineMiddleware", () => {
	it("returns the same function", () => {
		const fn = async (c: any, next: any) => {
			await next();
		};
		expect(defineMiddleware(fn)).toBe(fn);
	});
});

describe("loadMiddleware", () => {
	it("returns empty array for missing directory", async () => {
		const result = await loadMiddleware("/nonexistent/dir");
		expect(result).toEqual([]);
	});
});
