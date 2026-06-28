/**
 * Tests for JWT helper.
 */
import { describe, expect, it } from "vitest"
import { jwt } from "../src/helpers/jwt"

describe("JWT", () => {
	const secret = "test-secret"

	it("signs and verifies a token", () => {
		const token = jwt.sign({ userId: 1, role: "admin" }, { secret })
		const payload = jwt.verify(token, { secret })
		expect(payload.userId).toBe(1)
		expect(payload.role).toBe("admin")
		expect(payload.iat).toBeDefined()
		expect(payload.exp).toBeDefined()
	})

	it("rejects invalid signature", () => {
		const token = jwt.sign({ userId: 1 }, { secret })
		expect(() => jwt.verify(token, { secret: "wrong-secret" })).toThrow()
	})

	it("extracts Bearer token from header", () => {
		const token = jwt.sign({ userId: 1 }, { secret })
		const extracted = jwt.fromHeader(`Bearer ${token}`)
		expect(extracted).toBe(token)
	})

	it("returns null for missing header", () => {
		expect(jwt.fromHeader(undefined)).toBeNull()
		expect(jwt.fromHeader("")).toBeNull()
	})

	it("returns null for non-Bearer header", () => {
		expect(jwt.fromHeader("Basic abc123")).toBeNull()
	})

	it("honors expiresIn option", () => {
		const token = jwt.sign({ userId: 1 }, { secret, expiresIn: -1 })
		expect(() => jwt.verify(token, { secret })).toThrow("JWT expired")
	})
})
