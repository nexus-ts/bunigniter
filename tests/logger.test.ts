/**
 * Unit tests for Logger middleware.
 */

import { Elysia } from "elysia"
import { describe, expect, it } from "vitest"
import { loggerMiddleware } from "../src/helpers/logger"

describe("loggerMiddleware", () => {
	it("does not break normal responses", async () => {
		const logs: string[] = []
		const app = new Elysia()
			.use(
				loggerMiddleware({
					logFn: (msg) => {
						logs.push(msg)
					},
				}),
			)
			.get("/test", () => "ok")

		const res = await app.handle(new Request("http://localhost/test"))
		expect(res.status).toBe(200)
		expect(await res.text()).toBe("ok")
	})

	it("skips health endpoint by default", async () => {
		const logs: string[] = []
		const app = new Elysia()
			.use(
				loggerMiddleware({
					logFn: (msg) => {
						logs.push(msg)
					},
				}),
			)
			.get("/health", () => "ok")

		await app.handle(new Request("http://localhost/health"))
		expect(logs.length).toBe(0)
	})

	it("logs requests when not disabled", async () => {
		const logs: string[] = []
		const app = new Elysia()
			.use(
				loggerMiddleware({
					logFn: (msg) => {
						logs.push(msg)
					},
					skip: [],
				}),
			)
			.get("/hello", () => "world")

		await app.handle(new Request("http://localhost/hello"))
		expect(logs.length).toBeGreaterThan(0)
		expect(logs[0]).toContain("GET")
		expect(logs[0]).toContain("/hello")
	})

	it("disabled logger does nothing", async () => {
		const app = new Elysia().use(loggerMiddleware({ enabled: false })).get("/test", () => "ok")

		const res = await app.handle(new Request("http://localhost/test"))
		expect(res.status).toBe(200)
	})
})
