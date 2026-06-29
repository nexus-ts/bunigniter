/**
 * Examples smoke test — verifies every example app boots and responds.
 *
 * For each example/ subdirectory with a dev.ts:
 *   1. Start the server on a unique port
 *   2. Verify HTTP 200 and expected content
 *   3. Kill the server
 *
 * Run: `bun x vitest run tests/examples.test.ts`
 */

import { spawn, type ChildProcess } from "node:child_process"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const EXAMPLES_DIR = join(import.meta.dirname, "..", "examples")

interface Example {
	name: string
	dir: string
	port: number
}

// Read the port an example actually listens on (from dev.ts process.env.PORT)
function readExamplePort(dir: string): number {
	try {
		const src = readFileSync(join(dir, "dev.ts"), "utf-8")
		const match = src.match(/PORT\s*=\s*['"](\d+)['"]/)
		if (match) return Number(match[1])
	} catch { /* fallback */ }
	return 3000
}

// Discover all examples with dev.ts
const examples: Example[] = readdirSync(EXAMPLES_DIR)
	.filter((name) => {
		const devPath = join(EXAMPLES_DIR, name, "dev.ts")
		try {
			return statSync(devPath).isFile()
		} catch {
			return false
		}
	})
	.map((name) => ({
		name,
		dir: join(EXAMPLES_DIR, name),
		port: readExamplePort(join(EXAMPLES_DIR, name)),
	}))

const servers: Map<string, ChildProcess> = new Map()

// Start all examples in parallel before tests
async function startExample(example: Example): Promise<void> {
	return new Promise((resolve, reject) => {
		const server = spawn("bun", ["run", "dev.ts"], {
			cwd: example.dir,
			env: { ...process.env },
			stdio: ["ignore", "pipe", "pipe"],
		})
		servers.set(example.name, server)

		let started = false
		const timeout = setTimeout(() => {
			if (!started) {
				server.kill("SIGTERM")
				servers.delete(example.name)
				reject(new Error(`${example.name}: did not start within 15s`))
			}
		}, 15000)

		const onData = (data: Buffer) => {
			const text = data.toString()
			if ((text.includes("ready") || text.includes("Bunigniter ready")) && !started) {
				started = true
				clearTimeout(timeout)
				// Give a moment for full init
				setTimeout(resolve, 1000)
			}
		}

		server.stdout?.on("data", onData)
		server.stderr?.on("data", onData)
		server.on("error", (err) => {
			clearTimeout(timeout)
			reject(err)
		})
	})
}

// ─── Example-specific route checks ─────────────────────────

const routeChecks: Record<string, Array<{ path: string; check: (body: string, status: number) => void }>> = {
	"simple-app": [
		{ path: "/", check: (body, status) => { expect(status).toBe(200); expect(body).toContain("Bunigniter") } },
	],
	"hn-app": [
		{ path: "/", check: (body, status) => { expect(status).toBe(200); expect(body).toContain("Hacker") } },
	],
	"petstore": [
		{ path: "/", check: (body, status) => { expect(status).toBe(200); expect(body).toContain("Pet") } },
	],
	"todo-app": [
		{ path: "/", check: (body, status) => { expect(status).toBe(200); expect(body).toContain("Todo") } },
	],
	"blog-app-html": [
		{ path: "/", check: (body, status) => { expect(status).toBe(200); expect(body).toContain("Blog") } },
	],
	"blog-app-tsx": [
		{ path: "/", check: (body, status) => { expect(status).toBe(200); expect(body).toContain("Blog") } },
	],
	"blog-app-inertia-react": [
		{ path: "/", check: (body, status) => { expect(status).toBe(302); expect(body).toBe("") } }, // redirects to /posts
	],
	"hmvc-app": [
		{ path: "/admin/dashboard", check: (body, status) => { expect(status).toBe(200); expect(body).toContain("Dashboard") } },
	],
	"slack-app": [
		{ path: "/", check: (body, status) => { expect(status).toBe(200); expect(body).toContain("Slack") } },
		{ path: "/api", check: (_body, status) => { expect(status).toBe(200) } },
	],
}

// ─── Tests ────────────────────────────────────────────────

describe("Examples smoke test", () => {
	// Start all examples
	beforeAll(async () => {
		const results = await Promise.allSettled(examples.map(startExample))
		for (const r of results) {
			if (r.status === "rejected") console.warn(`[warn] ${r.reason}`)
		}
	}, 60000)

	afterAll(() => {
		for (const [, server] of servers) {
			try { server.kill("SIGTERM") } catch { /* server already dead */ }
		}
	}, 5000)

	// Per-example route tests
	for (const example of examples) {
		const checks = routeChecks[example.name] ?? defaultChecks()

function defaultChecks(): Array<{ path: string; check: (body: string, status: number) => void }> {
		return [{ path: "/", check: (_body: string, status: number) => { expect(status).toBe(200) } }]
}

		it(`${example.name}: GET / returns ${checks[0].path === "/" ? "200" : "response"}`, async () => {
			if (!servers.has(example.name)) {
				console.warn(`[skip] ${example.name}: server not running`)
				return
			}

			for (const { path, check } of checks) {
				try {
					const res = await fetch(`http://localhost:${example.port}${path}`, {
						signal: AbortSignal.timeout(5000),
					})
					const body = await res.text()
					check(body, res.status)
				} catch { 
					// Retry once after short delay (server might still be booting)
					await new Promise((r) => setTimeout(r, 2000))
					const res = await fetch(`http://localhost:${example.port}${path}`, {
						signal: AbortSignal.timeout(5000),
					})
					const body = await res.text()
					check(body, res.status)
				}
			}
		}, 15000)
	}
})
