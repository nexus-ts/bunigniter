/**
 * Slack Clone — Example App
 *
 * Demonstrates: Controller routing, Request input, DB queries,
 * Validation, Auth/Session, Templates (Rendu), File Upload,
 * Image manipulation, WebSocket, CLI seeding.
 *
 * Usage:
 *   bun run examples/slack-app/db/seed.ts    # Seed database
 *   bun run examples/slack-app/dev.ts         # Start dev server :3006
 */
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { Elysia } from "elysia";
import { DbClient } from "../../src/db/drizzle";
import { registerFileRoutes } from "../../src/router/file-router";
import { createCache } from "../../src/helpers/cache";
import { createUpload } from "../../src/helpers/upload";
import { ws } from "../../src/helpers/ws";
import {
	sessionMiddleware,
	authMiddleware,
} from "../../src/helpers/session-middleware";

const PORT = 3006;

async function main() {
	const db = new DbClient({
		dialect: "bun-sqlite",
		connection: { filename: join(import.meta.dirname, "db/slack.db") },
	});
	await db.open();
	console.log("[db] connected");

	const cache = createCache();
	const upload = createUpload({
		maxSize: 10 * 1024 * 1024,
		allowedMimes: [
			"image/jpeg",
			"image/png",
			"image/gif",
			"image/webp",
			"text/plain",
			"application/pdf",
		],
	});

	const app = new Elysia();

	app.use(sessionMiddleware({ key: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4" }));
	app.use(authMiddleware());
	app.decorate("db", db);

	// Static files
	const storageDir = join(process.cwd(), "storage");
	app.get("/storage/*", async (ctx: any) => {
		const filePath = join(storageDir, ctx.params["*"] ?? "");
		if (!filePath.startsWith(storageDir))
			return new Response("Forbidden", { status: 403 });
		if (!existsSync(filePath))
			return new Response("Not Found", { status: 404 });
		const content = readFileSync(filePath);
		const ext = filePath.split(".").pop()?.toLowerCase();
		const mime: Record<string, string> = {
			jpg: "image/jpeg",
			jpeg: "image/jpeg",
			png: "image/png",
			gif: "image/gif",
			webp: "image/webp",
			pdf: "application/pdf",
		};
		return new Response(content, {
			headers: {
				"content-type": mime[ext ?? ""] ?? "application/octet-stream",
			},
		});
	});

	await registerFileRoutes(app, {
		directory: "examples/slack-app/routes",
		prefix: "",
		db,
		cache,
		upload,
	});

	ws.mount(app);

	app.listen(PORT, () => {
		console.log(`\n  ⚡ SlackClone running at http://localhost:${PORT}`);
		console.log(`  📁 Routes:    ./examples/slack-app/routes/`);
		console.log(`  🔗 Login:     http://localhost:${PORT}/login`);
		console.log(`  👤 Test:      alice / password\n`);
	});
}

main().catch(console.error);
