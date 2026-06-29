/**
 * Playwright test for simple-app.
 *
 * Run: `bun run examples/simple-app/test.mjs`
 * Requires: chromium (bunx playwright install chromium)
 */
import { chromium } from "playwright"
import { spawn } from "node:child_process"
import { join } from "node:path"

const DIR = import.meta.dirname
const BASE_URL = "http://localhost:3000"

let server = null

function startServer() {
	return new Promise((resolve, reject) => {
		server = spawn("bun", ["run", "dev.ts"], {
			cwd: DIR,
			stdio: ["ignore", "pipe", "pipe"],
		})

		const onData = (data) => {
			const text = data.toString()
			process.stdout.write(`[server] ${text}`)
			if (text.includes("ready") || text.includes("Bunigniter ready")) {
				setTimeout(resolve, 800)
			}
		}

		server.stdout.on("data", onData)
		server.stderr.on("data", onData)
		server.on("error", reject)

		setTimeout(() => reject(new Error("Server start timeout")), 15000)
	})
}

function stopServer() {
	if (server) {
		server.kill("SIGTERM")
		server = null
	}
}

async function run() {
	let exitCode = 0

	try {
		console.log("\n  ◇  Starting simple-app server...")
		await startServer()
		console.log("  ✓  Server is running\n")

		const browser = await chromium.launch({ headless: true })
		const page = await browser.newPage()

		try {
			// ── Navigate ──
			await page.goto(BASE_URL, { waitUntil: "networkidle" })
			console.log("  ✓  Page loaded\n")

			// ── Test 1: Page title ──
			const title = await page.title()
			if (title !== "Welcome") {
				console.error(`  ✗  Expected title "Welcome", got "${title}"`)
				exitCode = 1
			} else {
				console.log("  ✓  Page title:", title)
			}

			// ── Test 2: Heading ──
			const h1 = await page.textContent("h1")
			if (!h1?.includes("Bunigniter")) {
				console.error(`  ✗  H1 should contain "Bunigniter", got "${h1}"`)
				exitCode = 1
			} else {
				console.log("  ✓  H1:", h1?.trim())
			}

			// ── Test 3: Welcome message ──
			const body = await page.textContent("body")
			if (!body?.includes("Your Bunigniter app is running!")) {
				console.error('  ✗  Missing welcome message')
				exitCode = 1
			} else {
				console.log("  ✓  Welcome message present")
			}

			// ── Test 4: Rocket logo ──
			const logo = await page.textContent(".logo")
			if (logo?.trim() !== "🚀") {
				console.error(`  ✗  Missing rocket logo, got "${logo?.trim()}"`)
				exitCode = 1
			} else {
				console.log("  ✓  Rocket logo")
			}

			// ── Test 5: Runtime info ──
			if (!body?.includes("Bun")) {
				console.error("  ✗  Runtime info missing")
				exitCode = 1
			} else {
				console.log("  ✓  Runtime info present")
			}

			// ── Test 6: Code tags ──
			const codeCount = await page.locator("code").count()
			if (codeCount < 2) {
				console.error(`  ✗  Expected >=2 code tags, found ${codeCount}`)
				exitCode = 1
			} else {
				console.log(`  ✓  ${codeCount} code tags`)
			}

			// ── Test 7: Footer link ──
			const footerText = await page.textContent(".footer")
			if (!footerText?.includes("Bunigniter")) {
				console.error("  ✗  Footer should mention Bunigniter")
				exitCode = 1
			} else {
				console.log("  ✓  Footer link present")
			}

			// ── Test 8: Badge ──
			const badge = await page.textContent(".badge")
			if (!badge?.includes("Simple App")) {
				console.error(`  ✗  Badge should have "Simple App", got "${badge?.trim()}"`)
				exitCode = 1
			} else {
				console.log("  ✓  Badge:", badge?.trim())
			}

			// ── Test 9: Screenshot ──
			await page.screenshot({
				path: join(DIR, "screenshot.png"),
				fullPage: true,
			})
			console.log("  ✓  Screenshot saved to examples/simple-app/screenshot.png")

			// ── Test 10: Layout structure ──
			const card = await page.$(".card")
			if (!card) {
				console.error("  ✗  Missing .card element")
				exitCode = 1
			} else {
				console.log("  ✓  Layout card found")
			}

			console.log(`\n  ${exitCode === 0 ? "✅ All tests passed!" : "❌ Some tests failed"}`)
		} finally {
			await browser.close()
		}
	} catch (err) {
		console.error("\n  ❌ Test error:", err.message)
		exitCode = 1
	} finally {
		stopServer()
		process.exit(exitCode)
	}
}

run()
