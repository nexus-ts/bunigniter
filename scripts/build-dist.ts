/**
 * Build Dist — copies source files to dist/ for npm publish.
 *
 * Since bunigniter is a Bun-native package, Bun consumers can
 * import TypeScript source directly. This script copies only
 * the necessary source files to dist/, minus tests and examples.
 *
 * Usage: `bun run scripts/build-dist.ts`
 */
import { cpSync, rmSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SRC = join(ROOT, "src");
const DIST = join(ROOT, "dist");

// Files/dirs to always copy from src/
const ALLOWLIST = [
	"index.ts",
	"base/",
	"helpers/",
	"router/",
	"db/",
	"view/",
	"cli/",
	"edge.ts",
	"edge-builder.ts",
	"client/",
];

// Files to exclude from dist/
const EXCLUDE_PATTERNS = [".test.", ".spec.", "/test/", "test-"];

function shouldExclude(name: string): boolean {
	return EXCLUDE_PATTERNS.some((p) => name.includes(p));
}

function copyDir(srcDir: string, dstDir: string): void {
	if (!existsSync(srcDir)) return;

	const entries = readdirSync(srcDir, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.name.startsWith(".")) continue;
		if (shouldExclude(entry.name)) continue;

		const srcPath = join(srcDir, entry.name);
		const dstPath = join(dstDir, entry.name);

		if (entry.isDirectory()) {
			copyDir(srcPath, dstPath);
		} else if (
			entry.isFile() &&
			(entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))
		) {
			mkdirSync(dstDir, { recursive: true });
			cpSync(srcPath, dstPath);
		}
	}
}

// Clean dist/
if (existsSync(DIST)) {
	rmSync(DIST, { recursive: true, force: true });
}
mkdirSync(DIST, { recursive: true });

// Copy allowlisted paths
for (const path of ALLOWLIST) {
	const srcPath = join(SRC, path);
	const dstPath = join(DIST, path);

	if (path.endsWith("/")) {
		// Directory
		copyDir(srcPath, dstPath);
	} else {
		// Single file
		if (existsSync(srcPath)) {
			// Ensure parent dir exists
			const parentDir = join(DIST, path.replace(/\/[^/]+$/, ""));
			if (parentDir !== DIST) {
				mkdirSync(parentDir, { recursive: true });
			}
			// Remove stale destination if it exists (e.g. leftover dir)
			if (existsSync(dstPath)) {
				rmSync(dstPath, { recursive: true, force: true });
			}
			cpSync(srcPath, dstPath);
		}
	}
}

// Copy package.json and rewrite exports paths for dist
const pkgSrc = join(ROOT, "package.json");
if (!existsSync(pkgSrc)) {
	console.error("[build:dist] package.json not found");
	process.exit(1);
}

try {
	const original = JSON.parse(readFileSync(pkgSrc, "utf-8"));

	// Step 1: Save backup of ORIGINAL root package.json (with ./src/ paths)
	const backupPath = join(ROOT, "package.json.dev");
	writeFileSync(backupPath, JSON.stringify(original, null, 2) + "\n");

	// Step 2: Create dist/package.json with ./ paths (for dist/ internal use)
	const distPkg = JSON.parse(JSON.stringify(original)); // deep clone
	if (distPkg.main) distPkg.main = distPkg.main.replace(/^(?:\.\/)?src\//, "./");
	if (distPkg.module) distPkg.module = distPkg.module.replace(/^(?:\.\/)?src\//, "./");
	if (distPkg.exports) {
		for (const [key, val] of Object.entries(distPkg.exports)) {
			if (typeof val === "string") {
				(distPkg.exports as Record<string, string>)[key] = val.replace(/^(?:\.\/)?src\//, "./");
			}
		}
	}
	writeFileSync(join(DIST, "package.json"), JSON.stringify(distPkg, null, 2) + "\n");

	// Step 3: Rewrite ROOT package.json to point to ./dist/ for npm consumers
	if (original.main) original.main = original.main.replace(/^(?:\.\/)?src\//, "./dist/");
	if (original.module) original.module = original.module.replace(/^(?:\.\/)?src\//, "./dist/");
	if (original.exports) {
		for (const [key, val] of Object.entries(original.exports)) {
			if (typeof val === "string") {
				(original.exports as Record<string, string>)[key] = val.replace(/^(?:\.\/)?src\//, "./dist/");
			}
		}
	}
	writeFileSync(pkgSrc, JSON.stringify(original, null, 2) + "\n");
	console.log("[build:dist] root package.json updated to point to dist/");
} catch (e) {
	console.error("[build:dist] Failed to process package.json:", e);
	process.exit(1);
}

// Copy README and LICENSE


// Count files
let fileCount = 0;
function count(dir: string): void {
	if (!existsSync(dir)) return;
	for (const e of readdirSync(dir, { withFileTypes: true })) {
		const p = join(dir, e.name);
		if (e.isDirectory()) count(p);
		else if (e.isFile()) fileCount++;
	}
}
count(DIST);

console.log(`[build:dist] ${fileCount} files copied to dist/`);
