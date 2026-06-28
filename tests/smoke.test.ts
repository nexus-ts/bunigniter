/**
 * Smoke test — verifies the app boots and responds to requests.
 */

import { type ChildProcess, spawn } from "node:child_process"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const PROJECT_ROOT = join(import.meta.dirname, "..")
const PORT = 15000
const BASE = `http://localhost:${PORT}`

let server: ChildProcess | null = null

beforeAll(async () => {
	return new Promise<void>((resolve, reject) => {
		server = spawn("bun", ["run", "src/index.ts"], {
			cwd: PROJECT_ROOT,
			env: { ...process.env, PORT: String(PORT), DEBUG: "false" },
			stdio: ["ignore", "pipe", "pipe"],
		})

		let started = false
		const timeout = setTimeout(() => {
			if (!started) reject(new Error("Server did not start within 10s"))
		}, 10000)

		server.stdout!.on("data", (data: Buffer) => {
			const text = data.toString()
			if (text.includes("ready") && !started) {
				started = true
				clearTimeout(timeout)
				resolve()
			}
		})

		server.stderr!.on("data", (data: Buffer) => {
			const text = data.toString()
			if (!started && text.includes("ready")) {
				started = true
				clearTimeout(timeout)
				resolve()
			}
		})

		server.on("error", reject)
	})
})

afterAll(() => {
	if (server) server.kill("SIGTERM")
}, 5000)

describe("Smoke Tests", () => {
	it("health endpoint returns 200", async () => {
		const res = await fetch(`${BASE}/health`)
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.status).toBe("ok")
	})

	it("hello endpoint returns app info", async () => {
		const res = await fetch(`${BASE}/hello`)
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.message).toBeDefined()
	})

	it("openapi endpoint returns spec", async () => {
		const res = await fetch(`${BASE}/openapi.json`)
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body.openapi).toBe("3.1.0")
		expect(body.paths).toBeDefined()
	})

	it("docs UI returns HTML with API reference", async () => {
		const res = await fetch(`${BASE}/docs`)
		expect(res.status).toBe(200)
		const text = await res.text()
		expect(text).toContain("api-reference")
		expect(text).toContain("openapi.json")
	})

	it("returns 404 for unknown route", async () => {
		const res = await fetch(`${BASE}/nonexistent`)
		expect(res.status).toBe(404)
	})
})
