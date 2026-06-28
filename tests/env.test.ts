/**
 * Unit tests for env helper.
 */

import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { env, setEnvDir } from "../src/helpers/env"

const TEST_DIR = join(tmpdir(), "bunigniter-test-env")

function writeEnv(filename: string, content: string) {
	if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true })
	writeFileSync(join(TEST_DIR, filename), content, "utf-8")
}

function cleanEnv() {
	const files = [".env", ".env.test", ".env.local", ".env.test.local"]
	for (const f of files) {
		const path = join(TEST_DIR, f)
		if (existsSync(path)) unlinkSync(path)
	}
}

describe("env()", () => {
	beforeEach(() => {
		cleanEnv()
		setEnvDir(TEST_DIR)
	})

	it("returns default when no .env file exists", () => {
		const val = env("MY_KEY", "default")
		expect(val).toBe("default")
	})

	it("reads from .env file", () => {
		writeEnv(".env", "MY_KEY=from_env")
		const val = env("MY_KEY", "default")
		expect(val).toBe("from_env")
	})

	it("returns number type", () => {
		writeEnv(".env", "PORT=8080")
		const val = env("PORT", 3000)
		expect(val).toBe(8080)
		expect(typeof val).toBe("number")
	})

	it("returns boolean type", () => {
		writeEnv(".env", "DEBUG=true")
		const val = env("DEBUG", false)
		expect(val).toBe(true)
		expect(typeof val).toBe("boolean")
	})

	it("returns undefined for missing key without default", () => {
		const val = env("MISSING_KEY")
		expect(val).toBeUndefined()
	})

	it("loads environment-specific .env files", () => {
		writeEnv(".env", "KEY=base")
		writeEnv(".env.test", "KEY=test")
		// With NODE_ENV=test, .env.test should override .env
		const old = process.env.NODE_ENV
		process.env.NODE_ENV = "test"
		setEnvDir(TEST_DIR) // reset cache
		const val = env("KEY", "default")
		expect(val).toBe("test")
		process.env.NODE_ENV = old
	})
})
