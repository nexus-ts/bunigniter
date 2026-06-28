/**
 * Unit tests for session helper.
 */
import { describe, expect, it } from "vitest"
import { Session } from "../src/helpers/session"

describe("Session", () => {
	it("starts empty", () => {
		const s = new Session()
		s.load(undefined)
		expect(s.get("key")).toBeUndefined()
		expect(s.has("key")).toBe(false)
	})

	it("set and get values", () => {
		const s = new Session()
		s.load(undefined)
		s.set("user_id", 42)
		s.set("name", "Alice")
		expect(s.get("user_id")).toBe(42)
		expect(s.get("name")).toBe("Alice")
	})

	it("delete values", () => {
		const s = new Session()
		s.load(undefined)
		s.set("key", "value")
		expect(s.get("key")).toBe("value")
		s.delete("key")
		expect(s.get("key")).toBeUndefined()
	})

	it("clear all", () => {
		const s = new Session()
		s.load(undefined)
		s.set("a", 1)
		s.set("b", 2)
		s.clear()
		expect(s.get("a")).toBeUndefined()
		expect(s.get("b")).toBeUndefined()
	})

	it("all() returns all data", () => {
		const s = new Session()
		s.load(undefined)
		s.set("a", 1)
		s.set("b", 2)
		// Access id to generate __session_id first
		const _id = s.id
		const data = s.all()
		expect(data.a).toBe(1)
		expect(data.b).toBe(2)
		expect(data.__session_id).toBeTruthy()
	})

	it("generates session ID", () => {
		const s = new Session()
		s.load(undefined)
		expect(s.id).toBeTruthy()
		expect(typeof s.id).toBe("string")
	})

	it("regenerates session ID", () => {
		const s = new Session()
		s.load(undefined)
		const oldId = s.id
		s.regenerate()
		expect(s.id).not.toBe(oldId)
	})

	it("serialize returns null when unchanged", () => {
		const s = new Session()
		s.load(undefined)
		expect(s.serialize()).toBeNull()
	})

	it("serialize returns value after modification", () => {
		const s = new Session()
		s.load(undefined)
		s.set("key", "value")
		const result = s.serialize()
		expect(result).not.toBeNull()
		expect(result!.value).toBeTruthy()
		expect(result!.maxAge).toBeGreaterThan(0)
	})

	it("load and reserialize round-trips", () => {
		const s1 = new Session()
		s1.load(undefined)
		s1.set("user", { id: 1, name: "Alice" })

		const cookie = s1.serialize()!.value

		const s2 = new Session()
		s2.load(cookie)
		const user = s2.get("user") as any
		expect(user.id).toBe(1)
		expect(user.name).toBe("Alice")
	})

	it("detects tampered cookies", () => {
		const s = new Session()
		s.load(undefined)
		s.set("key", "value")
		const cookie = s.serialize()!.value

		// Tamper with the cookie
		const tampered = `${cookie.slice(0, -5)}XXXXX`

		const s2 = new Session()
		expect(() => s2.load(tampered)).not.toThrow()
		expect(s2.get("key")).toBeUndefined() // Tampered = reset
	})

	it("returns empty for cleared session serialize", () => {
		const s = new Session()
		s.load(undefined)
		s.set("user", "test")
		s.serialize() // mark as dirty first time
		s.clear()
		const result = s.serialize()
		expect(result).not.toBeNull()
		expect(result!.maxAge).toBe(0) // Max-Age: 0 signals delete
	})
})
