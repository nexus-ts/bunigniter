/**
 * Restore root package.json from dev backup — runs after npm publish.
 *
 * This restores the local package.json paths from ./dist/ back to ./src/
 * and removes the dist/ directory.
 */
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const backupPath = join(ROOT, "package.json.dev");
const pkgSrc = join(ROOT, "package.json");
const DIST = join(ROOT, "dist");

try {
	if (existsSync(backupPath)) {
		const backup = readFileSync(backupPath, "utf-8");
		writeFileSync(pkgSrc, backup);
		rmSync(backupPath, { force: true });
		console.log("[restore] root package.json restored from backup");
	} else {
		console.warn("[restore] no backup found (package.json.dev) — skipping restore");
	}

	if (existsSync(DIST)) {
		rmSync(DIST, { recursive: true, force: true });
		console.log("[restore] dist/ removed");
	}
} catch (e) {
	console.error("[restore] Failed to restore package.json:", e);
	process.exit(1);
}
