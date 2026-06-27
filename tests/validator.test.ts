/**
 * Unit tests for validation helper.
 */
import { describe, it, expect } from 'vitest'
import { validate, validateStringRules, validateZod } from '../src/helpers/validator'
import { z } from 'zod'

describe('validateStringRules', () => {
	it('passes valid data', () => {
		const v = validateStringRules({ name: 'Alice' }, { name: 'required|min:2' })
		expect(v.passes).toBe(true)
		expect(v.fails()).toBe(false)
	})

	it('fails required field', () => {
		const v = validateStringRules({ name: '' }, { name: 'required' })
		expect(v.fails()).toBe(true)
		expect(v.errors.name).toBeDefined()
		expect(v.errors.name[0]).toContain('required')
	})

	it('fails min length', () => {
		const v = validateStringRules({ name: 'A' }, { name: 'required|min:2' })
		expect(v.fails()).toBe(true)
		expect(v.errors.name[0]).toContain('2 characters')
	})

	it('fails email validation', () => {
		const v = validateStringRules({ email: 'not-an-email' }, { email: 'required|email' })
		expect(v.fails()).toBe(true)
		expect(v.errors.email[0]).toContain('email')
	})

	it('passes valid email', () => {
		const v = validateStringRules({ email: 'test@example.com' }, { email: 'email' })
		expect(v.passes).toBe(true)
	})

	it('fails numeric for non-number', () => {
		const v = validateStringRules({ age: 'abc' }, { age: 'numeric' })
		expect(v.fails()).toBe(true)
		expect(v.errors.age[0]).toContain('number')
	})

	it('first() returns first error', () => {
		const v = validateStringRules({ name: '' }, { name: 'required' })
		expect(v.first('name')).toBeTruthy()
		expect(v.first('nonexistent')).toBeNull()
	})
})

describe('validateZod', () => {
	const schema = z.object({
		name: z.string().min(2),
		email: z.string().email(),
	})

	it('passes valid data', () => {
		const v = validateZod({ name: 'Alice', email: 'a@b.com' }, schema)
		expect(v.passes).toBe(true)
	})

	it('fails invalid data', () => {
		const v = validateZod({ name: 'A', email: 'bad' }, schema)
		expect(v.fails()).toBe(true)
		expect(v.errors.name).toBeDefined()
		expect(v.errors.email).toBeDefined()
	})

	it('parses valid data with coercion', () => {
		const numSchema = z.object({ age: z.coerce.number() })
		const v = validateZod({ age: '42' }, numSchema)
		expect(v.passes).toBe(true)
		expect(v.data.age).toBe(42)
	})
})

describe('validate (auto-detect)', () => {
	it('detects string rules', () => {
		const v = validate({ name: 'Alice' }, { name: 'required|min:2' })
		expect(v.passes).toBe(true)
	})

	it('detects Zod schema', () => {
		const v = validate({ name: 'Alice' }, z.object({ name: z.string().min(2) }))
		expect(v.passes).toBe(true)
	})
})
