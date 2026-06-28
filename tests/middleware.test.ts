/**
 * Unit tests for middleware loader.
 */
import { describe, it, expect } from "vitest";
import { Elysia } from "elysia";
import { applyMiddleware } from "../src/helpers/middleware";

describe("applyMiddleware", () => {
	it("applies no middleware when config is undefined", () => {
		const app = new Elysia();
		expect(() => applyMiddleware(app as any, undefined)).not.toThrow();
	});

	it("applies all middleware when config is provided empty", () => {
		const app = new Elysia();
		expect(() => applyMiddleware(app as any, {})).not.toThrow();
	});

	it("allows disabling individual middleware", () => {
		const app = new Elysia();
		expect(() =>
			applyMiddleware(app as any, {
				cors: false,
				logger: false,
				csrf: false,
				throttle: false,
			}),
		).not.toThrow();
	});

	it("works with fully configured middleware", async () => {
		const app = new Elysia() as any;
		applyMiddleware(app, {
			cors: { origin: ["http://test.com"] },
			logger: { enabled: true, skip: [] },
			csrf: { secret: "test" },
			throttle: { max: 100, window: 60000, skip: [] },
		});
		app.get("/test", () => "ok");

		const res = await app.handle(new Request("http://localhost/test"));
		expect(res.status).toBe(200);
	});
});
