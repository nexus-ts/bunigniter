/**
 * Unit tests for defineHandler.
 */
import { describe, it, expect } from "vitest";
import { defineHandler } from "../src/helpers/handler";
import { Elysia } from "elysia";

describe("defineHandler", () => {
	it("returns JSON for objects", async () => {
		const handler = defineHandler(async () => ({ message: "Hello" }));
		const res = await handler({
			request: new Request("http://localhost/"),
		} as any);
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("application/json");
		expect(await res.json()).toEqual({ message: "Hello" });
	});

	it("returns HTML for strings", async () => {
		const handler = defineHandler(async () => "<h1>Hello</h1>");
		const res = await handler({
			request: new Request("http://localhost/"),
		} as any);
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
		expect(await res.text()).toBe("<h1>Hello</h1>");
	});

	it("returns 204 for null/undefined", async () => {
		const handler = defineHandler(async () => null);
		const res = await handler({
			request: new Request("http://localhost/"),
		} as any);
		expect(res.status).toBe(204);
	});

	it("works as route handler via Elysia", async () => {
		const app = new Elysia() as any;
		app.get(
			"/hello",
			defineHandler(async () => ({ ok: true })),
		);
		const res = await app.handle(new Request("http://localhost/hello"));
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
	});
});

describe("defineHandler.withValidator", () => {
	it("validates body and passes data", async () => {
		const handler = defineHandler.withValidator({
			body: (await import("zod")).z.object({
				name: (await import("zod")).z.string().min(2),
			}),
		})(async (_c, { body }) => {
			return { received: body };
		});

		const c = {
			request: new Request("http://localhost/", {
				method: "POST",
				body: JSON.stringify({ name: "Alice" }),
				headers: { "content-type": "application/json" },
			}),
			body: { name: "Alice" },
		};
		const res = await handler(c as any);
		const data = await res.json();
		expect(data.received.name).toBe("Alice");
	});

	it("rejects invalid body", async () => {
		const handler = defineHandler.withValidator({
			body: (await import("zod")).z.object({
				name: (await import("zod")).z.string().min(2),
			}),
		})(async (_c, { body }) => {
			return { received: body };
		});

		const c = {
			request: new Request("http://localhost/", {
				method: "POST",
				body: JSON.stringify({ name: "A" }),
				headers: { "content-type": "application/json" },
			}),
			body: { name: "A" },
		};
		const res = await handler(c as any);
		expect(res.status).toBe(400);
		const data = await res.json();
		expect(data.error).toBe("Validation failed");
	});

	it("validates query params", async () => {
		const handler = defineHandler.withValidator({
			query: (await import("zod")).z.object({
				page: (await import("zod")).z.string(),
			}),
		})(async (_c, { query }) => {
			return { page: query?.page };
		});

		const c = {
			request: new Request("http://localhost/?page=2"),
			body: {},
		};
		const res = await handler(c as any);
		const data = await res.json();
		expect(data.page).toBe("2");
	});
});
