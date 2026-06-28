/**
 * Environment variable helper — CodeIgniter-style env().
 *
 * Reads from `.env` file and `process.env`. Values in `.env` override
 * system environment variables for development convenience.
 *
 * @example
 * ```ts
 * const port = env('PORT', 3000)
 * const dbUrl = env('DATABASE_URL')
 * const debug = env('DEBUG', false)
 * ```
 */
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

/** Parsed `.env` cache. */
let envCache: Record<string, string> | null = null

/** CWD for `.env` resolution. */
let envDir: string = process.cwd()

/**
 * Set the working directory for `.env` file lookup.
 * Called automatically; override for testing.
 */
export function setEnvDir(dir: string): void {
	envDir = dir
	envCache = null
}

/**
 * Parse `.env` file content string.
 * Supports:
 *   KEY=value
 *   KEY="quoted value"
 *   # comments
 *   export KEY=value
 */
function parseEnv(content: string): Record<string, string> {
	const result: Record<string, string> = {}
	for (const line of content.split("\n")) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith("#")) continue
		const match = trimmed.match(/^(?:export\s+)?([\w._-]+)\s*=\s*(.*)$/)
		if (!match) continue
		const key = match[1]
		let value = match[2].trim()

		// Strip quotes
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1)
		}
		result[key] = value
	}
	return result
}

/**
 * Load `.env` file from CWD (or configured envDir).
 * Supports `.env`, `.env.local`, `.env.{NODE_ENV}`, `.env.{NODE_ENV}.local`
 * — loaded in order, later files override earlier ones.
 */
export function loadEnv(): Record<string, string> {
	if (envCache) return envCache

	const env: Record<string, string> = { ...process.env } as Record<string, string>
	const nodeEnv = process.env.NODE_ENV ?? "development"

	// Load priority: .env.<environment>.local > .env.local > .env.<environment> > .env
	const files = [".env", `.env.${nodeEnv}`, ".env.local", `.env.${nodeEnv}.local`]

	for (const file of files) {
		const path = join(envDir, file)
		if (existsSync(path)) {
			const parsed = parseEnv(readFileSync(path, "utf-8"))
			Object.assign(env, parsed)
		}
	}

	envCache = env
	return env
}

/**
 * Read an environment variable with optional default.
 *
 * @param key - Environment variable name
 * @param defaultValue - Value to return if not set
 * @returns The value cast to the type of defaultValue, or string
 *
 * @example
 * ```ts
 * const port = env('PORT', 3000)        // number
 * const name = env('APP_NAME', 'MyApp') // string
 * const debug = env('DEBUG', false)     // boolean
 * const required = env('DATABASE_URL')  // string | undefined
 * ```
 */
function castValue<T>(value: string, defaultValue?: T): T {
	if (typeof defaultValue === "boolean") {
		return (value === "true" || value === "1" || value === "yes") as unknown as T
	}
	if (typeof defaultValue === "number") {
		return Number(value) as unknown as T
	}
	return value as unknown as T
}

export function env<T extends string | number | boolean>(key: string, defaultValue?: T): T {
	// Check actual process.env FIRST (it takes priority over .env files)
	const processValue = (process.env as Record<string, string>)[key]
	if (processValue !== undefined && processValue !== "") {
		return castValue(processValue, defaultValue)
	}

	// Then check .env file values
	const all = loadEnv()
	const value = all[key]

	if (value === undefined || value === "") {
		return defaultValue as T
	}

	return castValue(value, defaultValue)
}

/**
 * Require an environment variable. Throws if not set.
 */
export function envOrFail(key: string): string {
	const all = loadEnv()
	const value = all[key]
	if (value === undefined || value === "") {
		throw new Error(`Required environment variable "${key}" is not set.`)
	}
	return value
}
