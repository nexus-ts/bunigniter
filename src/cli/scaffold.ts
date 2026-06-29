/**
 * scaffold.ts — Interactive project scaffolding for `bi new` and `bi init`.
 *
 * Usage:
 *   bun run bi new              # 새 프로젝트 (인터랙티브)
 *   bun run bi new my-app       # 프로젝트명 지정
 *   bun run bi new my-app --yes # 기본값 사용
 *   bun run bi init             # 현재 디렉토리에 스캐폴드 (기존 package.json 병합)
 *
 * Templates: pkgJson, tsCfg, configApp, seedScript, routeIndex, routeApi,
 *            layoutHtml, welcomeView, wranglerToml, workerEntry, initSql
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"
import { cwd, exit, stdin, stdout } from "node:process"
import { render } from "./templates"

// External template files
const CONFIG_TPL = readFileSync(join(import.meta.dirname, "templates", "config-app.ts.tpl"), "utf-8")

// ═══════════════════════════════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════════════════════════════

const C = (s: string) => `\x1b[36m${s}\x1b[0m`
const G = (s: string) => `\x1b[32m${s}\x1b[0m`
const Y = (s: string) => `\x1b[33m${s}\x1b[0m`
const R = (s: string) => `\x1b[31m${s}\x1b[0m`
const D = (s: string) => `\x1b[90m${s}\x1b[0m`

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface ScaffoldOptions {
	projectName: string
	projectDir: string
	runtime: "bun" | "cloudflare"
	database: "sqlite" | "postgresql" | "mysql" | "none"
	openapi: boolean
	template: "simple" | "todo"
	install: boolean
	/** Existing package.json to merge (init mode) */
	mergePkg?: Record<string, any>
}

interface PromptResult {
	runtime: "bun" | "cloudflare"
	database: "sqlite" | "postgresql" | "mysql" | "none"
	openapi: boolean
	template: "simple" | "todo"
	install: boolean
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function ask(query: string, defaultVal = ""): Promise<string> {
	const display = defaultVal ? `${query} ${D(`[${defaultVal}]`)} ` : `${query} `
	stdout.write(display)
	return new Promise((resolve) => {
		const onData = (data: Buffer) => {
			stdin.removeListener("data", onData)
			stdin.pause()
			resolve(data.toString().trim() || defaultVal)
		}
		stdin.resume()
		stdin.on("data", onData)
	})
}

function sanitize(name: string): string {
	return name
		.replace(/\s+/g, "-")
		.replace(/[^a-zA-Z0-9\-_.]/g, "")
		.toLowerCase()
}

function ensureDir(dir: string): void {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function makeFile(filePath: string, content: string): void {
	ensureDir(filePath.substring(0, filePath.lastIndexOf("/")))
	writeFileSync(filePath, content, "utf-8")
	console.log(`  ${G("✓")}  Created: ${relative(cwd(), filePath)}`)
}

function t(tmpl: string, data: Record<string, any>): string {
	return render(tmpl, data)
}

// ═══════════════════════════════════════════════════════════════════
// SHARED PROMPT LOGIC  (new + init 모두 사용)
// ═══════════════════════════════════════════════════════════════════

async function promptOptions(skip: boolean, projectName: string): Promise<PromptResult> {
	// ─── 1. Runtime ──────────────────────────────────────────
	let runtime: "bun" | "cloudflare" = "bun"
	if (!skip) {
		const ans = await ask("Runtime?", "bun (Bun-only) / cloudflare (Bun + Cloudflare Workers)")
		runtime = ans === "cloudflare" || ans === "c" ? "cloudflare" : "bun"
	}

	// ─── 2. Database ─────────────────────────────────────────
	let database: "sqlite" | "postgresql" | "mysql" | "none" = "sqlite"
	if (!skip) {
		const ans = (await ask("Database? (sqlite / postgresql / mysql / none)", "sqlite")).toLowerCase()
		if (ans === "postgresql" || ans === "postgres" || ans === "p") database = "postgresql"
		else if (ans === "mysql" || ans === "m") database = "mysql"
		else if (ans === "none" || ans === "n") database = "none"
		else database = "sqlite"
	}

	// ─── 3. OpenAPI ───────────────────────────────────────────
	let openapi = false
	if (!skip) {
		const ans = (await ask("OpenAPI docs? (y/N)", "n")).toLowerCase()
		openapi = ans === "y" || ans === "yes"
	}

	// ─── 4. Template ──────────────────────────────────────────
	let template: "simple" | "todo" = "simple"
	if (!skip) {
		const ans = (await ask("Template?", "simple (welcome page) / todo (full CRUD)")).toLowerCase()
		if (ans === "todo" || ans === "t") template = "todo"
	}

	// ─── 5. Install ───────────────────────────────────────────
	let install = true
	if (!skip) {
		const ans = (await ask("Install dependencies?", "Y/n")).toLowerCase()
		install = ans !== "n" && ans !== "no"
	}

	// ─── Summary ──────────────────────────────────────────────
	console.log(`\n  ${D("─".repeat(40))}`)
	console.log(`  ${D("Project:")}  ${projectName}`)
	console.log(`  ${D("Runtime:")}  ${runtime === "cloudflare" ? "Bun + Cloudflare Workers" : "Bun-only"}`)
	console.log(`  ${D("Database:")} ${database === "none" ? "None" : database}`)
	console.log(`  ${openapi ? `${D("OpenAPI:")}  Yes` : ""}`)
	console.log(`  ${D("Template:")} ${template}`)
	if (!install) console.log(`  ${D("Install:")}  No (run 'bun install' later)`)
	console.log(`  ${D("─".repeat(40))}\n`)

	if (!skip) {
		const confirm = await ask("Continue?", "Y/n")
		if (confirm.toLowerCase() === "n" || confirm.toLowerCase() === "no") {
			console.log(`  ${Y("!")}  Cancelled`)
			exit(0)
		}
	}

	return { runtime, database, openapi, template, install }
}

// ═══════════════════════════════════════════════════════════════════
// POST-SCAFFOLD: 설치 + 안내 (new + init 공유)
// ═══════════════════════════════════════════════════════════════════

function finishSetup(
	projectName: string,
	projectDir: string,
	install: boolean,
	database: string,
	runtime: string,
): void {
	if (install) {
		console.log(`  ${D("Installing dependencies...")}\n`)
		const proc = Bun.spawnSync(["bun", "install"], {
			cwd: projectDir,
			stdout: "inherit",
			stderr: "inherit",
		})
		if (proc.exitCode === 0) {
			console.log(`\n  ${G("✓")}  Dependencies installed`)
		} else {
			console.log(`\n  ${Y("!")}  "bun install" exited with code ${proc.exitCode}`)
		}
	}

	console.log(`\n  ${G("■")}  ${projectName} is ready!\n`)
	console.log(`  ${D("Next steps:")}`)
	const cd = relative(cwd(), projectDir)
	if (cd) console.log(`    cd ${cd}`)
	if (database !== "none") console.log(`    bun run seed         ${D("# Create database & seed data")}`)
	console.log(`    bun run dev          ${D("# Start dev server at :3000")}`)
	console.log(`    DEBUG=true bun run dev ${D("# Enable debug toolbar")}`)

	if (runtime === "cloudflare") {
		console.log(`\n  ${C("── Cloudflare Workers ──")}`)
		console.log(`    wrangler d1 create ${projectName}-db  ${D("# Create D1 database")}`)
		console.log(`    # Update wrangler.toml with database_id`)
		console.log(`    bun run cf:dev                      ${D("# Local Workers dev")}`)
		console.log(`    bun run cf:db:init                  ${D("# Initialize D1 tables")}`)
		console.log(`    bun run cf:deploy                   ${D("# Deploy to Cloudflare")}`)
	}
	console.log(`\n  ${D("Open http://localhost:3000 in your browser.")}\n`)
}

// ═══════════════════════════════════════════════════════════════════
// PACKAGE.JSON MERGE HELPER
// ═══════════════════════════════════════════════════════════════════

function mergePackageJson(
	existing: Record<string, any>,
	scripts: Record<string, string>,
	deps: Record<string, string>,
	devDeps: Record<string, string>,
): string {
	const merged: Record<string, any> = { ...existing }

	// Merge scripts
	merged.scripts = { ...(merged.scripts || {}), ...scripts }

	// Merge dependencies (generated wins for version alignment)
	merged.dependencies = { ...(merged.dependencies || {}), ...deps }

	// Merge devDependencies
	merged.devDependencies = { ...(merged.devDependencies || {}), ...devDeps }

	// Ensure type and private
	if (!merged.type) merged.type = "module"
	if (merged.private === undefined) merged.private = true

	return `${JSON.stringify(merged, null, 2)}\n`
}

// ═══════════════════════════════════════════════════════════════════
// TEMPLATE GENERATORS
// ═══════════════════════════════════════════════════════════════════

function genPkgJson(
	name: string,
	openapi: boolean,
	cloudflare: boolean,
): { content: string; scripts: Record<string, string>; deps: Record<string, string>; devDeps: Record<string, string> } {
	const scripts: Record<string, string> = {
		dev: "bun --hot run dev.ts",
		start: "bun run dev.ts",
		seed: "bun run db/seed.ts",
		bi: "bun run node_modules/bunigniter/dist/cli/index.ts",
		"bi:repl": "bun run node_modules/bunigniter/dist/cli/index.ts repl",
	}
	if (openapi) scripts["generate:openapi"] = "bun run bi openapi:generate"
	if (cloudflare) {
		scripts["cf:dev"] = "wrangler dev"
		scripts["cf:deploy"] = "wrangler deploy"
		scripts["cf:db:init"] = `wrangler d1 execute \${npm_package_name}-db --file=./db/init.sql`
	}

	const deps: Record<string, string> = {
		bunigniter: "^0.4",
		"drizzle-orm": "^0.45",
		elysia: "^2.0.0-exp.12",
		rendu: "^0.1.0",
		react: "^19",
		"react-dom": "^19",
	}
	const devDeps: Record<string, string> = {}
	if (cloudflare) devDeps.wrangler = "^4"
	if (openapi) deps["openapi-types"] = "^12"

	return {
		content: `${JSON.stringify(
			{
				name,
				version: "1.0.0",
				type: "module",
				private: true,
				scripts,
				dependencies: deps,
				devDependencies: devDeps,
			},
			null,
			2,
		)}\n`,
		scripts,
		deps,
		devDeps,
	}
}

function genTsCfg(): string {
	return `${JSON.stringify(
		{
			compilerOptions: {
				target: "ES2022",
				module: "ESNext",
				moduleResolution: "Bundler",
				lib: ["ESNext", "DOM"],
				types: ["bun-types"],
				resolveJsonModule: true,
				allowImportingTsExtensions: true,
				noEmit: true,
				strict: true,
				skipLibCheck: true,
				esModuleInterop: true,
				isolatedModules: true,
			},
			include: [
				"config/**/*.ts",
				"routes/**/*.ts",
				"db/**/*.ts",
				"views/**/*.ts",
				"views/**/*.tsx",
				"middleware/**/*.ts",
				"modules/**/*.ts",
				"src/**/*.ts",
				"dev.ts",
			],
		},
		null,
		2,
	)}\n`
}

function genGitignore(): string {
	return `${[
		"node_modules/",
		"dist/",
		"*.db",
		".env",
		".env.local",
		".bi_repl_history",
		"*.db-shm",
		"*.db-wal",
		"*.db-journal",
		".test_uploads",
		".playwright-mcp/",
		"",
		"# Cloudflare / Wrangler",
		".wrangler/",
		"worker/",
	].join("\n")}\n`
}

function genEnvExample(database: string, cloudflare: boolean): string {
	const lines = [
		"# Bunigniter Environment Configuration",
		"# Copy this file to .env and customize.",
		"",
		"PORT=3000",
		"APP_KEY=",
		"DEBUG=false",
		"CORS_ORIGIN=*",
	]
	if (database === "sqlite") lines.push("DB_DIALECT=bun-sqlite", "DB_FILENAME=data/app.db")
	else if (database === "postgresql")
		lines.push("DB_DIALECT=postgres", "DATABASE_URL=postgres://user:pass@localhost:5432/mydb")
	else if (database === "mysql") lines.push("DB_DIALECT=mysql", "DATABASE_URL=mysql://user:pass@localhost:3306/mydb")
	if (cloudflare) lines.push("EDGE=false")
	return `${lines.join("\n")}\n`
}

function genDevEntry(name: string): string {
	return t(`/**\n * {{name}} — Entry point.\n */\nconsole.log("[app] Starting...")\nimport "bunigniter"\n`, { name })
}

function genConfigApp(database: string, cloudflare: boolean, openapi?: boolean): string {
	const dbLines: Record<string, string> = {
		sqlite: `\t\tdialect: env("DB_DIALECT", "bun-sqlite") as any,\n\t\tconnection: { filename: env("DB_FILENAME", "data/app.db") },`,
		postgresql: `\t\tdialect: "postgres",\n\t\tconnection: { url: env("DATABASE_URL", "postgres://localhost:5432/mydb") },`,
		mysql: `\t\tdialect: "mysql",\n\t\tconnection: { url: env("DATABASE_URL", "mysql://localhost:3306/mydb") },`,
		none: `\t\tdialect: "bun-sqlite" as any,\n\t\tconnection: { filename: ":memory:" },`,
	}
	const edgeBlock = cloudflare
		? `,

	// ─── Edge / Cloudflare ──────────────────────────────
	edge: { enabled: env("EDGE", "false") as unknown as boolean, d1Binding: "DB" },`
		: ""
	const servicesBlock =
		openapi === false
			? `,

	// ─── Services ───────────────────────────────────────────
	services: {
		openapi: false,
	},`
			: ""

	// Replace placeholders in the template
	let out = CONFIG_TPL.replace("{{DB}}", dbLines[database] ?? dbLines.sqlite)
	out = out.replace("{{EDGE}}", edgeBlock)
	out = out.replace("{{SERVICES}}", servicesBlock)
	return out
}

function genSeedScript(database: string): string {
	if (database === "none")
		return `/** No database configured.\n */\nconsole.log("[seed] No database configured. Set DB_DIALECT in .env")\n`
	const isSql = database === "sqlite"
	const dbImport = isSql
		? `import { Database } from "bun:sqlite"\nimport { join } from "node:path"\nimport { mkdirSync, existsSync } from "node:fs"\n\nconst DATA_DIR = join(import.meta.dirname, "..", "data")\nif (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })\nconst db = new Database(join(DATA_DIR, "app.db"))\ndb.run("PRAGMA journal_mode=WAL")`
		: `console.log("[seed] Database: ${database} — configure via DATABASE_URL")\nconst db = null`
	const table = isSql
		? `\ndb.run(\n  "CREATE TABLE IF NOT EXISTS items (" +\n  "  id INTEGER PRIMARY KEY AUTOINCREMENT," +\n  "  title TEXT NOT NULL," +\n  "  content TEXT DEFAULT ''," +\n  "  created_at TEXT NOT NULL DEFAULT (datetime('now'))," +\n  "  updated_at TEXT NOT NULL DEFAULT (datetime('now'))" +\n  ")"\n)`
		: ""
	const seed = isSql
		? `\nconst existing = db.query("SELECT count(*) as count FROM items").get() as any\nif (existing.count === 0) {\n  db.run("INSERT INTO items (title, content) VALUES ('Welcome to Bunigniter', 'Your first item!')")\n  db.run("INSERT INTO items (title, content) VALUES ('Build something great', 'Fullstack apps with Bun')")\n  db.run("INSERT INTO items (title, content) VALUES ('Deploy to production', 'Edge-ready framework')")\n  console.log("[seed] 3 items created")\n} else {\n  console.log(\`[seed] \${existing.count} items already exist\`)\n}`
		: ""
	return `${dbImport}\n\nconsole.log("[seed] Creating tables...")${table}${seed}\n\nconsole.log("[seed] done")${isSql ? "\ndb.close()" : ""}\n`
}

function genRouteIndex(): string {
	return `/**\n * Home — welcome page.\n */\nimport { Controller } from "bunigniter"\n\nexport class Home extends Controller {\n\tasync index() {\n\t\treturn this.view("welcome", {\n\t\t\ttitle: "Welcome to Bunigniter",\n\t\t\tmessage: "Your project is ready!",\n\t\t})\n\t}\n}\n`
}

function genRouteApi(openapi: boolean): string {
	if (!openapi)
		return `/**\n * API Example.\n */\nimport { defineHandler } from "bunigniter"\n\nexport const GET = defineHandler(async () => ({\n\tmessage: "Hello from Bunigniter!",\n\ttimestamp: new Date().toISOString(),\n}))\n`
	return `/**\n * API — OpenAPI-documented.\n */\nimport { defineHandler } from "bunigniter"\nimport { z } from "zod"\n\nexport const GET = defineHandler(async () => ({\n\tmessage: "Hello from Bunigniter!",\n\ttimestamp: new Date().toISOString(),\n}))\n\nexport const POST = defineHandler.withValidator({\n\tbody: z.object({ name: z.string().min(1).max(100) }),\n})(async (_, { body }) => ({\n\treceived: { ...body, upperName: body.name.toUpperCase() },\n}))\n`
}

function genLayoutHtml(): string {
	return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title><?= title ?? "Bunigniter" ?></title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0f0f23;color:#e0e0e0;min-height:100vh}
.container{max-width:780px;margin:0 auto;padding:40px 20px}
.nav{display:flex;gap:16px;margin-bottom:32px;padding-bottom:16px;border-bottom:1px solid #333;align-items:center}
.nav a{color:#70a1ff;text-decoration:none;font-size:14px}
.nav a:hover{color:#e94560}.nav .brand{color:#e94560;font-weight:bold;font-size:18px;margin-right:auto}
.footer{margin-top:40px;padding-top:20px;border-top:1px solid #333;text-align:center;color:#666;font-size:12px}
h1{color:#e94560;margin-bottom:16px}
.btn{display:inline-block;padding:8px 18px;border-radius:6px;text-decoration:none;font-size:14px;border:none;cursor:pointer}
.btn-primary{background:#e94560;color:#fff}.btn-secondary{background:#1a1a3e;color:#70a1ff;border:1px solid #333}
</style></head><body>
<div class="container">
<nav class="nav"><span class="brand">🚀 Bunigniter</span><a href="/">Home</a><a href="/api">API</a></nav>
<main><?= slot ?></main>
<div class="footer"><p>Powered by Bun + Elysia + Bunigniter | MIT License</p></div>
</div></body></html>`
}

function genWelcomeView(): string {
	return `<div style="text-align:center;padding:60px 0">
<h1 style="font-size:48px;margin-bottom:16px">🚀 Bunigniter</h1>
<p style="font-size:18px;color:#888;margin-bottom:24px"><?= message ?? "Your project is ready!" ?></p>
<p style="color:#aaa;margin-bottom:8px">Edit <code>routes/index.ts</code> / <code>views/welcome.html</code></p>
<div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:32px">
<a href="/api" class="btn btn-primary">🔌 API Demo</a></div>
<div style="color:#555;font-size:13px;line-height:1.8">
<p>⚡ <code>bun run dev</code> — Start server</p>
<p>⚡ <code>bun run seed</code> — Seed database</p>
<p>⚡ <code>bun run bi repl</code> — Interactive REPL</p>
</div></div>`
}

function genWranglerToml(name: string): string {
	return `# Cloudflare Workers
name = "${name}"
main = "src/worker.ts"
compatibility_date = "2026-06-01"
compatibility_flags = ["nodejs_compat"]
[[d1_databases]]
binding = "DB"
database_name = "${name}-db"
database_id = ""
preview_database_id = ""
[vars]
DEBUG = "false"
CORS_ORIGIN = "*"
ROUTER_PREFIX = ""
[observability]
enabled = true
`
}

function genWorkerEntry(): string {
	return `/**
 * Cloudflare Worker entry point.
 */
import { Elysia } from "elysia"
declare class D1Database { prepare(sql: string): D1PreparedStatement }
declare class D1PreparedStatement { bind(...p: unknown[]): D1PreparedStatement; run(): Promise<any> }
interface Env { DB: D1Database; CORS_ORIGIN?: string }
function json(d: unknown, s = 200) { return new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } }) }
const LAYOUT = \`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>{{TITLE}}</title><style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0f0f23;color:#e0e0e0;min-height:100vh}
.container{max-width:780px;margin:0 auto;padding:40px 20px;text-align:center}
.nav{display:flex;gap:16px;margin-bottom:32px;padding-bottom:16px;border-bottom:1px solid #333}
.nav a{color:#70a1ff;text-decoration:none;font-size:14px}.nav a:hover{color:#e94560}
.nav .brand{color:#e94560;font-weight:bold;font-size:18px;margin-right:auto}
h1{color:#e94560;margin-bottom:16px}.btn{display:inline-block;padding:8px 18px;border-radius:6px;text-decoration:none;font-size:14px;border:none;cursor:pointer;background:#e94560;color:#fff}
</style></head><body><div class="container"><nav class="nav"><span class="brand">🚀 Bunigniter</span><a href="/">Home</a><a href="/api">API</a></nav><main>{{SLOT}}</main></div></body></html>\`
function wrap(t: string, c: string) { return LAYOUT.replace("{{TITLE}}",t).replace("{{SLOT}}",c) }
export default {
  async fetch(req: Request, env: Env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } })
    const app = new Elysia()
    app.get("/", () => new Response(wrap("Welcome",\`<h1 style="font-size:48px">🚀 Bunigniter</h1><p style="font-size:18px;color:#888;margin-bottom:24px">Deployed on Cloudflare Workers!</p><a href="/api" class="btn">🔌 API</a>\`),{headers:{"content-type":"text/html;charset=utf-8"}}))
    app.get("/api", () => json({ message: "Hello from Bunigniter on Cloudflare!", timestamp: new Date().toISOString() }))
    app.get("/health", () => json({ status: "ok", runtime: "cloudflare", timestamp: new Date().toISOString() }))
    return app.fetch(req)
  }
}
`
}

function genInitSql(): string {
	return `-- D1 Database initialization script
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO items (title, content) VALUES ('Welcome to Bunigniter', 'Deployed on Cloudflare Workers!');
INSERT INTO items (title, content) VALUES ('Edge-ready', 'Running on Cloudflare Workers via D1');
INSERT INTO items (title, content) VALUES ('D1 Database', 'SQLite-compatible serverless database');
`
}

// ═══════════════════════════════════════════════════════════════════
// MAIN SCAFFOLD FUNCTION
// ═══════════════════════════════════════════════════════════════════

export async function scaffoldProject(options: ScaffoldOptions): Promise<void> {
	const { projectName, projectDir, runtime, database, openapi, template, mergePkg } = options
	const isCf = runtime === "cloudflare"

	console.log(`\n  ${G("◇")}  Scaffolding ${C(projectName)}...\n`)

	const subdirs = ["config", "routes", "views", "db", "data"]
	if (isCf) subdirs.push("src")
	for (const sub of subdirs) ensureDir(join(projectDir, sub))

	// package.json: merge 또는 새로 생성
	const pkg = genPkgJson(projectName, openapi, isCf)
	if (mergePkg) {
		makeFile(join(projectDir, "package.json"), mergePackageJson(mergePkg, pkg.scripts, pkg.deps, pkg.devDeps))
	} else {
		makeFile(join(projectDir, "package.json"), pkg.content)
	}

	makeFile(join(projectDir, "tsconfig.json"), genTsCfg())
	makeFile(join(projectDir, ".gitignore"), genGitignore())
	makeFile(join(projectDir, ".env.example"), genEnvExample(database, isCf))
	makeFile(join(projectDir, "dev.ts"), genDevEntry(projectName))
	makeFile(join(projectDir, "config", "app.ts"), genConfigApp(database, isCf, openapi))

	if (database !== "none") {
		if (template === "todo") {
			makeFile(join(projectDir, "db", "seed.ts"), genTodoSeedScript())
		} else {
			makeFile(join(projectDir, "db", "seed.ts"), genSeedScript(database))
		}
	}

	if (template === "todo") {
		// Todo template: full CRUD todo app
		makeFile(join(projectDir, "routes", "index.ts"), genTodoRouteIndex())
		if (database === "none") {
			makeFile(join(projectDir, "helpers", "json-db.ts"), genJsonDbHelper())
			makeFile(join(projectDir, "routes", "todos.ts"), genTodoRouteTodosJson())
		} else {
			makeFile(join(projectDir, "routes", "todos.ts"), genTodoRouteTodos())
		}
		makeFile(join(projectDir, "views", "_layout.html"), genLayoutHtml())
		makeFile(join(projectDir, "views", "todos.html"), genTodoViewTodos())
	} else {
		// Simple template: welcome page + API route
		makeFile(join(projectDir, "routes", "index.ts"), genRouteIndex())
		makeFile(join(projectDir, "routes", "api.ts"), genRouteApi(openapi))
		makeFile(join(projectDir, "views", "_layout.html"), genLayoutHtml())
		makeFile(join(projectDir, "views", "welcome.html"), genWelcomeView())
	}

	if (isCf) {
		makeFile(join(projectDir, "wrangler.toml"), genWranglerToml(projectName))
		makeFile(join(projectDir, "src", "worker.ts"), genWorkerEntry())
		makeFile(join(projectDir, "db", "init.sql"), genInitSql())
	}

	console.log(`\n  ${G("✓")}  Project "${projectName}" scaffolded\n`)
}

// ═══════════════════════════════════════════════════════════════════
// bi new  — 새 디렉토리에 프로젝트 생성
// ═══════════════════════════════════════════════════════════════════

export async function newProject(args: string[]): Promise<void> {
	const skip = args.includes("--yes") || args.includes("-y")
	let projectName = args.find((a) => !a.startsWith("-")) ?? ""
	let projectDir = ""

	if (!projectName) {
		projectDir = cwd()
		projectName = projectDir.split("/").pop() ?? "my-app"
		const contents = readdirSync(projectDir)
		const hasContent = contents.some((f) => f !== "package.json" && f !== "node_modules" && !f.startsWith("."))
		if (hasContent) {
			console.log(`  ${Y("!")}  Directory not empty. Use "bi init" for existing projects.`)
			exit(1)
		}
	} else {
		projectName = sanitize(projectName)
		if (!projectName) {
			console.log(`  ${R("✗")}  Invalid project name`)
			exit(1)
		}
		projectDir = join(cwd(), projectName)
		if (existsSync(projectDir)) {
			console.log(`  ${R("✗")}  Directory "${projectName}" already exists`)
			exit(1)
		}
		mkdirSync(projectDir, { recursive: true })
		console.log(`  ${G("◇")}  Created directory ${C(projectName)}`)
	}

	console.log(`\n  ${G("◇")}  ${C("bi new")} — Create a new Bunigniter project\n`)

	const opts = await promptOptions(skip, projectName)
	await scaffoldProject({ projectName, projectDir, ...opts })
	finishSetup(projectName, projectDir, opts.install, opts.database, opts.runtime)
}

// ═══════════════════════════════════════════════════════════════════
// bi init  — 현재 디렉토리에 스캐폴드 (기존 package.json 병합)
// ═══════════════════════════════════════════════════════════════════

export async function initProject(args: string[]): Promise<void> {
	const skip = args.includes("--yes") || args.includes("-y")
	const projectDir = cwd()
	const projectName = projectDir.split("/").pop() ?? "my-app"

	// 기존 package.json 읽기
	let mergePkg: Record<string, any> | undefined
	const pkgPath = join(projectDir, "package.json")
	if (existsSync(pkgPath)) {
		try {
			mergePkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
			console.log(`  ${G("◇")}  Existing package.json found — will merge scripts & deps`)
		} catch {
			/* ignore — will create fresh */
		}
	}

	console.log(`\n  ${G("◇")}  ${C("bi init")} — Scaffold Bunigniter into current directory\n`)

	const opts = await promptOptions(skip, projectName)
	await scaffoldProject({ projectName, projectDir, ...opts, mergePkg })
	finishSetup(projectName, projectDir, opts.install, opts.database, opts.runtime)
}

// ═══════════════════════════════════════════════════════════════════
// TODO TEMPLATE GENERATORS
// ═══════════════════════════════════════════════════════════════════

function genTodoRouteIndex(): string {
	return `/**
 * Home — redirects to /todos.
 */
import { Controller } from "bunigniter"

export class Home extends Controller {
	async index() {
		return this.redirect("/todos")
	}
}
`
}

function genTodoRouteTodos(): string {
	return `/**
 * Todos Controller — full CRUD with Rendu views.
 *
 * GET    /todos        -> List all todos
 * GET    /todos/new    -> Show create form
 * POST   /todos        -> Create todo
 * POST   /todos/:id    -> Update or delete (via _method)
 */
import { Controller } from "bunigniter"

interface Todo {
	id: number
	title: string
	completed: number
	created_at: string
}

export class Todos extends Controller {
	async index() {
		const result = await this.db.query<Todo>("SELECT * FROM todos ORDER BY created_at DESC")
		const todos = result.rows ?? []
		const activeCount = todos.filter((t: Todo) => !t.completed).length
		return this.view("todos", {
			title: "Todos",
			todos,
			total: todos.length,
			activeCount,
		})
	}

	async create() {
		const v = this.validate(this.body, { title: "required|min:1|max:500" })
		if (v.fails()) {
			const result = await this.db.query<Todo>("SELECT * FROM todos ORDER BY created_at DESC")
			return this.view("todos", {
				title: "Todos",
				todos: result.rows ?? [],
				total: result.rows?.length ?? 0,
				activeCount: result.rows?.filter((t: Todo) => !t.completed).length ?? 0,
				errors: v.errors,
				oldTitle: this.request.post("title", ""),
			})
		}
		await this.db.query("INSERT INTO todos (title) VALUES (?)", [v.data.title.trim()])
		return this.redirect("/todos")
	}

	async update(id: number) {
		const body = this.body
		if (body?.title !== undefined) {
			const v = this.validate(body, { title: "required|min:1|max:500" })
			if (v.fails()) return this.badRequest(v.errors)
			await this.db.query("UPDATE todos SET title = ?, completed = ? WHERE id = ?", [
				v.data.title.trim(), body.completed ? 1 : 0, id,
			])
		} else {
			await this.db.query("UPDATE todos SET completed = ? WHERE id = ?", [
				body?.completed ? 1 : 0, id,
			])
		}
		return this.redirect("/todos")
	}

	async destroy(id: number) {
		await this.db.query("DELETE FROM todos WHERE id = ?", [id])
		return this.redirect("/todos")
	}
}
`
}

function genTodoViewTodos(): string {
	return `<div style="max-width: 560px; margin: 0 auto;">
  <h1>📋 Todos (<?= activeCount ?? 0 ?> active)</h1>

  <? if (errors) { ?>
    <div style="background: #5c1a1a; border: 1px solid #e94560; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;">
      <? for (const err of Object.values(errors)) { ?>
        <p style="color: #e94560; font-size: 13px;"><?= Array.isArray(err) ? err[0] : err ?></p>
      <? } ?>
    </div>
  <? } ?>

  <form action="/todos" method="POST" style="display: flex; gap: 8px; margin-bottom: 24px;">
    <input type="text" name="title" placeholder="What needs to be done?" value="<?= oldTitle ?? '' ?>"
      style="flex:1; padding:10px 14px; border-radius:8px; border:1px solid #333; background:#1a1a3e; color:#fff; font-size:14px;" required />
    <button type="submit" class="btn btn-primary" style="white-space: nowrap;">+ Add</button>
  </form>

  <? if (todos && todos.length > 0) { ?>
    <? for (const todo of todos) { ?>
      <div class="card" style="display: flex; align-items: center; gap: 12px;">
        <form action="/todos/<?= todo.id ?>" method="POST" style="margin: 0;">
          <input type="hidden" name="_method" value="PUT" />
          <input type="hidden" name="completed" value="<?= todo.completed ? 0 : 1 ?>" />
          <button type="submit" style="background: none; border: none; cursor: pointer; font-size: 18px;">
            <? if (todo.completed) { ?>✅<? } else { ?>⬜<? } ?>
          </button>
        </form>
        <span style="flex:1; <?= todo.completed ? 'text-decoration: line-through; color: #555;' : '' ?>">
          <?= todo.title ?>
        </span>
        <form action="/todos/<?= todo.id ?>" method="POST" style="margin: 0;">
          <input type="hidden" name="_method" value="DELETE" />
          <button type="submit" style="background: none; border: none; color: #666; cursor: pointer; font-size: 16px;">✕</button>
        </form>
      </div>
    <? } ?>
    <p style="text-align: center; color: #555; font-size: 12px; margin-top: 16px;">
      <?= total ?> total · <?= activeCount ?> active · <?= total - activeCount ?> completed
    </p>
  <? } else { ?>
    <div style="text-align: center; padding: 60px 0; color: #666;">
      <p style="font-size: 48px; margin-bottom: 16px;">📭</p>
      <p>No todos yet. Add one above!</p>
    </div>
  <? } ?>
</div>`
}

function genTodoSeedScript(): string {
	return `/**
 * Todo seeder — creates tables and sample todos.
 */
import { Database } from "bun:sqlite"
import { join } from "node:path"
import { mkdirSync, existsSync } from "node:fs"

const DATA_DIR = join(import.meta.dirname, "..", "data")
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(join(DATA_DIR, "app.db"))
db.run("PRAGMA journal_mode=WAL")

db.run(
  "CREATE TABLE IF NOT EXISTS todos (" +
  "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "  title TEXT NOT NULL," +
  "  completed INTEGER DEFAULT 0," +
  "  created_at TEXT NOT NULL DEFAULT (datetime('now'))" +
  ")"
)

const existing = db.query("SELECT count(*) as count FROM todos").get() as any
if (existing.count === 0) {
  db.run("INSERT INTO todos (title) VALUES ('Learn Bunigniter')")
  db.run("INSERT INTO todos (title) VALUES ('Build an app')")
  db.run("INSERT INTO todos (title) VALUES ('Deploy to production')")
  db.run("INSERT INTO todos (title, completed) VALUES ('Done task', 1)")
  console.log("[seed] 4 todos created")
} else {
  console.log(\`[seed] \${existing.count} todos already exist\`)
}

db.close()
console.log("[seed] done")
`
}

// ═══════════════════════════════════════════════════════════════════
// JSON DATA STORE — in-memory storage for database=none mode
// ═══════════════════════════════════════════════════════════════════

function genJsonDbHelper(): string {
	return `/**
 * JSON data store — lightweight in-memory storage for demo/DB-less mode.
 * Used when no database is configured. Data resets on server restart.
 */
interface StoreItem {
	id: number
	[key: string]: any
}

const stores = new Map<string, StoreItem[]>()
const counters = new Map<string, number>()

export function jsonDb(table: string) {
	if (!stores.has(table)) {
		stores.set(table, [])
		counters.set(table, 1)
	}
	const items = stores.get(table)!
	let counter = counters.get(table)!

	return {
		all<T = StoreItem>(): T[] { return items as T[] },

		get<T = StoreItem>(id: number): T | undefined { return items.find(i => i.id === id) as T },

		insert(data: Record<string, any>): StoreItem {
			const item = { id: counter++, ...data, created_at: new Date().toISOString() }
			items.push(item)
			counters.set(table, counter)
			return item
		},

		update(id: number, data: Record<string, any>): StoreItem | null {
			const idx = items.findIndex(i => i.id === id)
			if (idx === -1) return null
			items[idx] = { ...items[idx], ...data }
			return items[idx]
		},

		delete(id: number): boolean {
			const idx = items.findIndex(i => i.id === id)
			if (idx === -1) return false
			items.splice(idx, 1)
			return true
		},

		count(): number { return items.length },
	}
}

// Seed data for demo
export function seedTodos() {
	const db = jsonDb("todos")
	if (db.count() > 0) return
	db.insert({ title: "Learn Bunigniter", completed: false })
	db.insert({ title: "Build an app", completed: false })
	db.insert({ title: "Deploy to production", completed: false })
	db.insert({ title: "Done task", completed: true })
}
`
}

// ═══════════════════════════════════════════════════════════════════
// JSON-BASED TODO CONTROLLER (for database=none mode)
// ═══════════════════════════════════════════════════════════════════

function genTodoRouteTodosJson(): string {
	return `/**
 * Todos Controller — full CRUD with JSON data store.
 * No database required — data resets on server restart.
 */
import { Controller } from "bunigniter"
import { jsonDb, seedTodos } from "../helpers/json-db"

interface Todo {
	id: number
	title: string
	completed: boolean
	created_at: string
}

export class Todos extends Controller {
	async index() {
		seedTodos() // ensure demo data on first run
		const todos = jsonDb<Todo>("todos").all().reverse()
		const activeCount = todos.filter(t => !t.completed).length
		return this.view("todos", {
			title: "Todos",
			todos,
			total: todos.length,
			activeCount,
		})
	}

	async create() {
		const v = this.validate(this.body, { title: "required|min:1|max:500" })
		if (v.fails()) return this.redirect("/todos")
		jsonDb("todos").insert({ title: this.request.post("title", "").trim(), completed: false })
		return this.redirect("/todos")
	}

	async update(id: number) {
		const body = this.body
		if (body?.title !== undefined) {
			jsonDb("todos").update(id, { title: body.title.trim(), completed: body.completed ? true : false })
		} else {
			jsonDb("todos").update(id, { completed: body?.completed ? true : false })
		}
		return this.redirect("/todos")
	}

	async destroy(id: number) {
		jsonDb("todos").delete(id)
		return this.redirect("/todos")
	}
}
`
}
