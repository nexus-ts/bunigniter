/**
 * Unit tests for session-middleware.
 */

import { Elysia } from "elysia"
import { describe, expect, it } from "vitest"
import { authMiddleware, sessionMiddleware } from "../src/helpers/session-middleware"

const SESSION_CONFIG = {
	name: "test_sess",
	key: "test-key-32chars!!!!!!",
} as const

describe("sessionMiddleware", () => {
	it("injects session into context", async () => {
		const app: any = new Elysia()
			.use(sessionMiddleware(SESSION_CONFIG))
			.get("/test", ({ session }: any) => new Response(String(!!session)))

		const res = await app.handle(new Request("http://localhost/test"))
		expect(await res.text()).toBe("true")
	})

	it("session supports get/set", async () => {
		const app: any = new Elysia().use(sessionMiddleware(SESSION_CONFIG)).get("/test", ({ session }: any) => {
			session.set("name", "Alice")
			return new Response(session.get("name"))
		})

		const res = await app.handle(new Request("http://localhost/test"))
		expect(await res.text()).toBe("Alice")
	})
})

describe("authMiddleware", () => {
	it("injects auth into context", async () => {
		const app: any = new Elysia()
			.use(sessionMiddleware(SESSION_CONFIG))
			.use(authMiddleware())
			.get("/test", ({ auth }: any) => new Response(String(auth.check())))

		const res = await app.handle(new Request("http://localhost/test"))
		expect(await res.text()).toBe("false")
	})

	it("auth.login sets user", async () => {
		const app: any = new Elysia()
			.use(sessionMiddleware(SESSION_CONFIG))
			.use(authMiddleware())
			.get("/test", ({ auth }: any) => {
				auth.login({ id: 1, name: "Alice" })
				return new Response(JSON.stringify(auth.user()))
			})

		const res = await app.handle(new Request("http://localhost/test"))
		const user = JSON.parse(await res.text())
		expect(user.id).toBe(1)
		expect(user.name).toBe("Alice")
	})

	it("auth.logout clears user", async () => {
		const app: any = new Elysia()
			.use(sessionMiddleware(SESSION_CONFIG))
			.use(authMiddleware())
			.get("/test", ({ auth }: any) => {
				auth.login({ id: 1 })
				auth.logout()
				return new Response(String(auth.check()))
			})

		const res = await app.handle(new Request("http://localhost/test"))
		expect(await res.text()).toBe("false")
	})
})
