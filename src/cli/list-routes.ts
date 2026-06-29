/**
 * Shared route listing — used by both `nx list` CLI and `.routes` REPL command.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const CWD = process.cwd()

const D = (s: string) => `\x1b[90m${s}\x1b[0m`

export async function listRoutes(): Promise<void> {
	const routesDir = join(CWD, "routes")
	if (!existsSync(routesDir)) {
		console.log("  No routes directory found.")
		return
	}

	const files = readdirSync(routesDir)
	const prefix = process.env.ROUTER_PREFIX ?? "/api"

	console.log("\n  Bunigniter Routes")
	console.log("  ─────────────────────────────────")

	let count = 0

	// ─── System routes (conditional) ──────────────
	if (existsSync(join(CWD, "config", "app.ts"))) {
		const configContent = readFileSync(join(CWD, "config", "app.ts"), "utf-8")

		// Check if health endpoint is enabled (default: true)
		if (!configContent.includes("health: false") && !configContent.includes('"health": false')) {
			console.log(`\n  ${D("[system]".padEnd(48))}`)
			console.log(`  ${D("GET".padEnd(6))} ${D("/health".padEnd(25))} ${D("System.health()")}`)
			count++
		}

		// Check if OpenAPI is enabled (default: true)
		if (!configContent.includes("openapi: false") && !configContent.includes('"openapi": false')) {
			console.log(`  ${D("GET".padEnd(6))} ${D("/openapi.json".padEnd(25))} ${D("OpenAPI.spec()")}`)
			console.log(`  ${D("GET".padEnd(6))} ${D("/docs".padEnd(25))} ${D("OpenAPI.docsUI()")}`)
			count += 2
		}
	}

	// ─── File routes ─────────────────────────────────────
	console.log(`\n  ${"File Routes".padEnd(48)}`)
	for (const file of files.sort()) {
		if (!file.endsWith(".ts") || file.endsWith(".server.ts")) continue

		const fullPath = join(routesDir, file)
		if (!statSync(fullPath).isFile()) continue

		const content = readFileSync(fullPath, "utf-8")
		const name = file.replace(/\.ts$/, "")
		const isIndex = name === "index"

		const classMatch = content.match(/export (default )?class (\w+) extends Controller/)
		const className = classMatch ? classMatch[2] : name

		// Check for defineHandler pattern: export const GET = ...
		const handlerMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"]
		let hasHandler = false

		for (const verb of handlerMethods) {
			if (content.includes(`export const ${verb} =`)) {
				hasHandler = true
				const path = isIndex ? prefix : `${prefix}/${name}`
				console.log(`  ${verb.padEnd(6)} ${path.padEnd(25)} ${className}.${verb}()`)
				count++
			}
		}

		if (hasHandler) continue

		// Controller class methods
		const methods = ["index", "show", "create", "update", "destroy"]
		const methodVerbs: Record<string, string> = {
			index: "GET",
			show: "GET",
			create: "POST",
			update: "PUT",
			destroy: "DELETE",
		}
		const idMethods = new Set(["show", "update", "destroy"])

		for (const method of methods) {
			if (!content.includes(`async ${method}`)) continue
			const verb = methodVerbs[method]
			const path = idMethods.has(method)
				? isIndex
					? `${prefix}/:id`
					: `${prefix}/${name}/:id`
				: isIndex
					? prefix
					: `${prefix}/${name}`
			console.log(`  ${verb.padEnd(6)} ${path.padEnd(25)} ${className}.${method}()`)
			count++
		}
	}

	if (count === 0) console.log("  (no routes found)")
	console.log()
}
