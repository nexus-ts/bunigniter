/**
 * Unit tests for Rate Limiter middleware.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { Elysia } from "elysia";
import { rateLimiter } from "../src/helpers/throttle";

describe("rateLimiter", () => {
	it("allows requests under limit", async () => {
		const app = new Elysia()
			.use(rateLimiter({ max: 10, window: 60000, skip: [] }))
			.get("/test", () => "ok");

		const res = await app.handle(new Request("http://localhost/test"));
		expect(res.status).toBe(200);
		expect(res.headers.get("x-ratelimit-limit")).toBe("10");
		expect(res.headers.get("x-ratelimit-remaining")).toBe("9");
	});

	it("blocks requests over limit", async () => {
		const app = new Elysia()
			.use(rateLimiter({ max: 2, window: 60000, skip: [] }))
			.get("/test", () => "ok");

		// First two requests should pass
		const res1 = await app.handle(new Request("http://localhost/test"));
		expect(res1.status).toBe(200);

		const res2 = await app.handle(new Request("http://localhost/test"));
		expect(res2.status).toBe(200);

		// Third should be blocked
		const res3 = await app.handle(new Request("http://localhost/test"));
		expect(res3.status).toBe(429);
	});

	it("skips configured paths", async () => {
		const app = new Elysia()
			.use(rateLimiter({ max: 0, skip: ["/health"] }))
			.get("/health", () => "ok");

		const res = await app.handle(new Request("http://localhost/health"));
		expect(res.status).toBe(200);
	});

	it("returns retry-after header when blocked", async () => {
		const app = new Elysia()
			.use(rateLimiter({ max: 1, window: 60000, skip: [] }))
			.get("/test", () => "ok");

		await app.handle(new Request("http://localhost/test"));
		const res = await app.handle(new Request("http://localhost/test"));

		expect(res.status).toBe(429);
		expect(res.headers.get("retry-after")).toBeTruthy();
	});
});
