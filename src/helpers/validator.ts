/**
 * Validation helper — CodeIgniter-style string rules + Zod integration.
 *
 * Two modes:
 *   1. String rules: `this.validate(body, { name: 'required|min:2' })`
 *   2. Zod schema:   `this.validate(body, z.object({ name: z.string().min(2) }))`
 *
 * @example
 * ```ts
 * // String rules (CodeIgniter style)
 * const v = this.validate(this.body, {
 *   name: 'required|min:2|max:100',
 *   email: 'required|email'
 * })
 * if (v.fails()) return this.badRequest(v.errors())
 *
 * // Zod schema (TypeScript style)
 * const schema = z.object({ name: z.string().min(2), email: z.string().email() })
 * const v = this.validate(this.body, schema)
 * if (v.fails()) return this.badRequest(v.errors())
 * ```
 */
import type { z } from "zod"

// ─── Types ─────────────────────────────────────────────────────

/** Validation errors map: field → messages[] */
export interface ValidationErrors {
	[field: string]: string[]
}

/** Validation result. */
export class ValidationResult<T = Record<string, any>> {
	constructor(
		public passes: boolean,
		public data: T,
		public errors: ValidationErrors = {},
	) {}

	fails(): boolean {
		return !this.passes
	}

	/** Get first error for a field. */
	first(field: string): string | null {
		return this.errors[field]?.[0] ?? null
	}

	/** Get all errors for a field. */
	get(field: string): string[] {
		return this.errors[field] ?? []
	}

	/** Convert to plain object (for JSON response). */
	toJSON(): { passes: boolean; errors: ValidationErrors } {
		return { passes: this.passes, errors: this.errors }
	}
}

// ─── String Rule Validator ─────────────────────────────────────

type Rules = Record<string, string>

/** Built-in validation rules. */
const RULES: Record<string, (value: any, param?: string) => string | null> = {
	required: (value) => (value === undefined || value === null || value === "" ? "This field is required" : null),

	min: (value, param) => {
		const min = Number(param)
		if (Number.isNaN(min)) return null
		if (typeof value === "string" && value.length < min) return `Must be at least ${min} characters`
		if (typeof value === "number" && value < min) return `Must be at least ${min}`
		return null
	},

	max: (value, param) => {
		const max = Number(param)
		if (Number.isNaN(max)) return null
		if (typeof value === "string" && value.length > max) return `Must not exceed ${max} characters`
		if (typeof value === "number" && value > max) return `Must not exceed ${max}`
		return null
	},

	email: (value) =>
		typeof value === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "Must be a valid email address" : null,

	numeric: (value) => (typeof value !== "number" && Number.isNaN(Number(value)) ? "Must be a number" : null),

	integer: (value) => (!Number.isInteger(Number(value)) ? "Must be an integer" : null),

	boolean: (value) =>
		typeof value !== "boolean" && !["true", "false", "0", "1"].includes(String(value)) ? "Must be a boolean" : null,

	url: (value) => (typeof value === "string" && !/^https?:\/\/.+/.test(value) ? "Must be a valid URL" : null),

	alpha: (value) => (typeof value === "string" && !/^[a-zA-Z]+$/.test(value) ? "Must contain only letters" : null),

	alpha_num: (value) =>
		typeof value === "string" && !/^[a-zA-Z0-9]+$/.test(value) ? "Must contain only letters and numbers" : null,

	alpha_dash: (value) =>
		typeof value === "string" && !/^[a-zA-Z0-9_-]+$/.test(value)
			? "Must contain only letters, numbers, dashes, and underscores"
			: null,

	same: (value, param, data) => {
		if (!param) return null
		return data?.[param] !== value ? `Must match ${param}` : null
	},

	differs: (value, param, data) => {
		if (!param) return null
		return data?.[param] === value ? `Must differ from ${param}` : null
	},

	regex: (value, param) => {
		if (!param) return null
		try {
			return new RegExp(param).test(String(value)) ? null : "Format is invalid"
		} catch {
			return null
		}
	},

	date: (value) => (typeof value === "string" && Number.isNaN(Date.parse(value)) ? "Must be a valid date" : null),

	after: (value, param) => {
		if (!param || typeof value !== "string") return null
		return Date.parse(value) <= Date.parse(param) ? `Must be after ${param}` : null
	},

	before: (value, param) => {
		if (!param || typeof value !== "string") return null
		return Date.parse(value) >= Date.parse(param) ? `Must be before ${param}` : null
	},

	size: (value, param) => {
		const size = Number(param)
		if (Number.isNaN(size)) return null
		if (typeof value === "string" && value.length !== size) return `Must be exactly ${size} characters`
		if (typeof value === "number" && value !== size) return `Must be exactly ${size}`
		if (Array.isArray(value) && value.length !== size) return `Must contain exactly ${size} items`
		return null
	},

	required_if: (value, param, data) => {
		if (!param) return null
		const [field, ...rest] = param.split(",")
		const expected = rest.join(",")
		if (data?.[field] === expected && (value === undefined || value === null || value === "")) {
			return "This field is required"
		}
		return null
	},
}

/**
 * Validate data against string rules (CodeIgniter-style).
 *
 * @param data - The data to validate (usually `this.body`)
 * @param rules - Object mapping field names to pipe-separated rule strings
 * @returns ValidationResult
 *
 * @example
 * ```ts
 * const v = validateStringRules(this.body, {
 *   name: 'required|min:2|max:100',
 *   email: 'required|email',
 *   age: 'numeric|min:18',
 * })
 * ```
 */
export function validateStringRules<T extends Record<string, any>>(data: T, rules: Rules): ValidationResult<T> {
	const errors: ValidationErrors = {}
	const validData: Record<string, any> = { ...data }

	for (const [field, ruleString] of Object.entries(rules)) {
		const ruleList = ruleString
			.split("|")
			.map((r) => r.trim())
			.filter(Boolean)
		const value = data[field]

		for (const ruleDef of ruleList) {
			const [ruleName, ...paramParts] = ruleDef.split(":")
			const param = paramParts.join(":")

			const ruleFn = RULES[ruleName]
			if (!ruleFn) continue

			const error = ruleFn(value, param, data)
			if (error) {
				;(errors[field] ??= []).push(error)
			}
		}

		// Trim values
		if (typeof validData[field] === "string") {
			validData[field] = validData[field].trim()
		}
	}

	return new ValidationResult<T>(Object.keys(errors).length === 0, validData as T, errors)
}

/**
 * Validate data against a Zod schema.
 *
 * @param data - The data to validate
 * @param schema - Zod schema
 * @returns ValidationResult
 *
 * @example
 * ```ts
 * const schema = z.object({ name: z.string().min(2), email: z.string().email() })
 * const v = validateZod(this.body, schema)
 * ```
 */
export function validateZod<T>(data: unknown, schema: z.ZodSchema<T>): ValidationResult<T> {
	const result = schema.safeParse(data)
	if (result.success) {
		return new ValidationResult(true, result.data, {})
	}

	const errors: ValidationErrors = {}
	for (const issue of result.error.issues) {
		const path = issue.path.join(".")
		;(errors[path] ??= []).push(issue.message)
	}
	return new ValidationResult(false, data as T, errors)
}

/**
 * Universal validate — auto-detects string rules vs Zod schema.
 */
export function validate<T extends Record<string, any>>(
	data: unknown,
	schemaOrRules: z.ZodSchema<T> | Rules,
): ValidationResult<T> {
	// Detect Zod schema (it's an object with safeParse method)
	if (schemaOrRules && typeof schemaOrRules === "object" && "safeParse" in schemaOrRules) {
		return validateZod(data, schemaOrRules as unknown as z.ZodSchema<T>)
	}
	return validateStringRules(data as Record<string, any>, schemaOrRules as Rules) as unknown as ValidationResult<T>
}

/** Rule names for autocomplete. */
export const rules = {
	required: "required",
	min: (n: number) => `min:${n}`,
	max: (n: number) => `max:${n}`,
	email: "email",
	numeric: "numeric",
	integer: "integer",
	boolean: "boolean",
	url: "url",
	alpha: "alpha",
	alphaNum: "alpha_num",
	alphaDash: "alpha_dash",
	same: (field: string) => `same:${field}`,
	differs: (field: string) => `differs:${field}`,
	regex: (pattern: string) => `regex:${pattern}`,
	date: "date",
	after: (date: string) => `after:${date}`,
	before: (date: string) => `before:${date}`,
	size: (n: number) => `size:${n}`,
	requiredIf: (field: string, value: string) => `required_if:${field},${value}`,
} as const
