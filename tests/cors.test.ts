/**
 * Unit tests for CORS middleware.
 */
import { describe, it, expect } from "vitest";
import { Elysia } from "elysia";
import { corsMiddleware } from "../src/helpers/cors";

describe("corsMiddleware", () => {
	it("returns 204 for OPTIONS preflight", async () => {
		const app = new Elysia().use(corsMiddleware()).get("/test", () => "ok");

		const res = await app.handle(
			new Request("http://localhost/test", {
				method: "OPTIONS",
				headers: { origin: "http://example.com" },
			}),
		);

		expect(res.status).toBe(204);
		expect(res.headers.get("access-control-allow-origin")).toBe(
			"http://example.com",
		);
		expect(res.headers.get("access-control-allow-methods")).toContain("GET");
		expect(res.headers.get("access-control-allow-credentials")).toBe("true");
	});

	it("adds CORS headers to normal responses", async () => {
		const app = new Elysia().use(corsMiddleware()).get("/test", () => "ok");

		const res = await app.handle(
			new Request("http://localhost/test", {
				headers: { origin: "http://example.com" },
			}),
		);

		expect(res.status).toBe(200);
		expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
		expect(res.headers.get("access-control-allow-credentials")).toBe("true");
		await expect(res.text()).resolves.toBe("ok");
	});

	it("restricts origins when configured as array", async () => {
		const app = new Elysia()
			.use(corsMiddleware({ origin: ["https://app.com"] }))
			.get("/test", () => "ok");

		const res = await app.handle(
			new Request("http://localhost/test", {
				headers: { origin: "https://evil.com" },
			}),
		);

		expect(res.headers.get("access-control-allow-origin")).toBe(
			"https://app.com",
		);
	});

	it("uses origin function", async () => {
		const app = new Elysia()
			.use(
				corsMiddleware({
					origin: (origin: string) => origin.endsWith(".com"),
				}),
			)
			.get("/test", () => "ok");

		const res = await app.handle(
			new Request("http://localhost/test", {
				headers: { origin: "https://good.com" },
			}),
		);

		expect(res.headers.get("access-control-allow-origin")).toBe(
			"https://good.com",
		);
	});

	it("sets expose headers when configured", async () => {
		const app = new Elysia()
			.use(corsMiddleware({ exposeHeaders: "X-Custom" }))
			.get("/test", () => "ok");

		const res = await app.handle(new Request("http://localhost/test"));

		expect(res.headers.get("access-control-expose-headers")).toBe("X-Custom");
	});

	it("works without origin header", async () => {
		const app = new Elysia().use(corsMiddleware()).get("/test", () => "ok");

		const res = await app.handle(new Request("http://localhost/test"));

		expect(res.status).toBe(200);
		expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
	});
});
