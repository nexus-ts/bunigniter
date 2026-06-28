/**
 * Build Dist — copies source files to dist/ for npm publish.
 *
 * Since bunigniter is a Bun-native package, Bun consumers can
 * import TypeScript source directly. This script copies only
 * the necessary source files to dist/, minus tests and examples.
 *
 * Usage: `bun run scripts/build-dist.ts`
 */
import { cpSync, rmSync, existsSync, mkdirSync, readdirSync } from "node:fs";
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

// Also copy package.json (for version info), README, LICENSE at dist root
const filesToCopy = ["package.json", "README.md", "LICENSE"];
for (const file of filesToCopy) {
	const srcPath = join(ROOT, file);
	if (existsSync(srcPath)) {
		cpSync(srcPath, join(DIST, file));
	}
}

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
