/**
 * Schema-Derived Validators — Void-style createInsertSchema / createSelectSchema / createUpdateSchema.
 *
 * Generates Zod schemas from Drizzle table definitions for use with
 * `defineHandler.withValidator()`.
 *
 * @example
 * ```ts
 * // db/schema.ts
 * import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
 * import { createInsertSchema } from 'nexusts/db'
 *
 * export const users = sqliteTable('users', {
 *   id: integer('id').primaryKey({ autoIncrement: true }),
 *   name: text('name').notNull(),
 *   email: text('email').notNull().unique(),
 *   role: text('role').notNull().default('user'),
 * })
 *
 * export const insertUserSchema = createInsertSchema(users, {
 *   name: (schema) => schema.min(2),
 *   email: (schema) => schema.email(),
 * })
 * ```
 *
 * Then in a route handler:
 * ```ts
 * import { defineHandler } from 'nexusts'
 * import { insertUserSchema } from '@schema'
 *
 * export const POST = defineHandler.withValidator({
 *   body: insertUserSchema,
 * })(async (c, { body }) => {
 *   return db.insert(users).values(body).returning()
 * })
 * ```
 */
import { z } from "zod"

/**
 * Column type info extracted from a Drizzle table column definition.
 */
interface ColumnInfo {
	name: string
	type: string
	notNull: boolean
	hasDefault: boolean
	isPrimaryKey: boolean
	isAutoIncrement: boolean
}

/**
 * Infer column info from a Drizzle table's `_` internal structure.
 * This works with drizzle-orm >= 0.45.
 */
function getColumns(table: any): ColumnInfo[] {
	const cols: ColumnInfo[] = []
	// Drizzle stores columns in table[Symbol.for('drizzle:columns')]
	const drizzleCols = table?.[Symbol.for("drizzle:columns")] ?? table?._ ?? {}

	for (const [name, col] of Object.entries<any>(drizzleCols)) {
		cols.push({
			name,
			type: col?.type ?? "text",
			notNull: col?.notNull ?? false,
			hasDefault: col?.hasDefault ?? false,
			isPrimaryKey: col?.primaryKey ?? false,
			isAutoIncrement: col?.autoIncrement ?? false,
		})
	}

	// Fallback: try to get columns from the table's structure
	if (cols.length === 0) {
		for (const key of Object.keys(table)) {
			if (key.startsWith("_") || key === "name" || key === "Symbol") continue
			const col = table[key]
			if (col && typeof col === "object" && col.name) {
				cols.push({
					name: col.name,
					type: col.type ?? "text",
					notNull: col.notNull ?? false,
					hasDefault: col.hasDefault ?? false,
					isPrimaryKey: col.primaryKey ?? false,
					isAutoIncrement: col.autoIncrement ?? false,
				})
			}
		}
	}

	return cols
}

/**
 * Map Drizzle column types to Zod schemas.
 */
function columnToZod(col: ColumnInfo): z.ZodTypeAny {
	let schema: z.ZodTypeAny

	switch (col.type) {
		case "number":
		case "integer":
		case "serial":
			schema = z.number()
			break
		case "boolean":
			schema = z.boolean()
			break
		case "json":
		case "jsonb":
			schema = z.record(z.any())
			break
		default:
			schema = z.string()
			break
	}

	// Apply nullability
	if (!col.notNull) {
		schema = schema.nullable().optional()
	}
	if (col.isAutoIncrement) {
		schema = schema.optional()
	}

	return schema
}

/**
 * Create a Zod schema for INSERT operations.
 * Auto-generated columns (id, timestamps with defaults) become optional.
 *
 * @param table - Drizzle table definition
 * @param refinements - Optional field-level refinements (e.g. `.min(2)`, `.email()`)
 * @returns Zod object schema
 *
 * @example
 * ```ts
 * export const insertUserSchema = createInsertSchema(users, {
 *   name: (schema) => schema.min(2),
 *   email: (schema) => schema.email(),
 * })
 * ```
 */
export function createInsertSchema<T extends Record<string, any>>(
	table: any,
	refinements?: Partial<{
		[K in keyof T]: (schema: z.ZodTypeAny) => z.ZodTypeAny
	}>,
): z.ZodObject<any> {
	const columns = getColumns(table)
	const shape: Record<string, z.ZodTypeAny> = {}

	for (const col of columns) {
		// Skip auto-increment primary keys (DB generates them)
		if (col.isAutoIncrement) continue

		let schema = columnToZod(col)

		// Apply refinements
		if (refinements?.[col.name as keyof typeof refinements]) {
			const refine = refinements[col.name as keyof typeof refinements]!
			schema = refine(schema)
		}

		shape[col.name] = schema
	}

	return z.object(shape)
}

/**
 * Create a Zod schema for SELECT operations.
 * All columns are optional (you might not select all).
 *
 * @param table - Drizzle table definition
 * @returns Zod object schema
 *
 * @example
 * ```ts
 * export const selectUserSchema = createSelectSchema(users)
 * ```
 */
export function createSelectSchema(table: any): z.ZodObject<any> {
	const columns = getColumns(table)
	const shape: Record<string, z.ZodTypeAny> = {}

	for (const col of columns) {
		shape[col.name] = columnToZod(col).optional()
	}

	return z.object(shape)
}

/**
 * Create a Zod schema for UPDATE operations.
 * All fields are optional (partial update).
 *
 * @param table - Drizzle table definition
 * @param refinements - Optional field-level refinements
 * @returns Zod object schema
 *
 * @example
 * ```ts
 * export const updateUserSchema = createUpdateSchema(users, {
 *   email: (schema) => schema.email(),
 * })
 * ```
 */
export function createUpdateSchema<T extends Record<string, any>>(
	table: any,
	refinements?: Partial<{
		[K in keyof T]: (schema: z.ZodTypeAny) => z.ZodTypeAny
	}>,
): z.ZodObject<any> {
	const insertSchema = createInsertSchema(table, refinements)
	const shape = insertSchema.shape

	// Make all fields optional
	const optionalShape: Record<string, z.ZodTypeAny> = {}
	for (const [key, schema] of Object.entries(shape)) {
		optionalShape[key] = (schema as z.ZodTypeAny).optional()
	}

	return z.object(optionalShape)
}
