/**
 * Drizzle wrapper — CodeIgniter-style database interface.
 *
 * Provides `db.query('SQL', [params])` for raw SQL with parameter binding,
 * plus full Drizzle ORM access for type-safe queries.
 *
 * @example
 * ```ts
 * // Raw SQL (CodeIgniter style)
 * const users = await db.query('SELECT * FROM users WHERE id = ?', [1])
 *
 * // Drizzle ORM (type-safe)
 * const rows = await db.select().from(users).all()
 * ```
 */
import { type ExtractTablesWithRelations } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'

/** Dialect types supported. */
export type Dialect = 'postgres' | 'mysql' | 'sqlite' | 'bun-sqlite' | 'd1'

/** Database configuration. */
export interface DbConfig {
	dialect: Dialect
	connection: Record<string, any>
	logging?: boolean
	autoMigrate?: boolean
	migrationsFolder?: string
}

/** Query result from raw SQL. */
export interface QueryResult<T = any> {
	rows: T[]
	affectedRows: number
	insertId?: number | string
}

/**
 * Thin wrapper around Drizzle ORM.
 *
 * Wraps a Drizzle database client and exposes:
 *   - `query(sql, params)` — CodeIgniter-style raw SQL
 *   - `select()` / `insert(table)` / `update(table)` / `delete(table)` — Drizzle builders
 *   - `transaction(fn)` — ACID transactions
 */
export class DbClient {
	private client: any
	private dialect: Dialect
	private rawExecutor: RawExecutor | null = null
	private opened = false
	private config: DbConfig

	constructor(config: DbConfig) {
		this.config = config
		this.dialect = config.dialect
	}

	/** Initialize the database connection. */
	async open(): Promise<void> {
		if (this.opened) return
		const drv = await resolveDriver(this.dialect, this.config)
		this.client = drv.db
		this.rawExecutor = drv.rawExecutor ?? null
		this.opened = true
	}

	/** The raw Drizzle client for type-safe queries. */
	get drizzle(): any {
		this.assertOpen()
		return this.client
	}

	/** Database dialect name. */
	get dialectName(): Dialect {
		return this.dialect
	}

	// ─── Raw SQL (CodeIgniter style) ─────────────────────────────

	/**
	 * Execute a parameterized SQL query.
	 *
	 * @example
	 * ```ts
	 * const users = await db.query('SELECT * FROM users WHERE id = ?', [1])
	 * const result = await db.query('INSERT INTO users (name) VALUES (?)', ['Alice'])
	 * ```
	 */
	/**
	 * Tagged template SQL — Drizzle-style `sql\`...\``.
	 * Inline parameters, no need for separate params array.
	 *
	 * @example
	 * ```ts
	 * await db.sql\`SELECT * FROM users WHERE id = ${id}\`
	 * await db.sql\`UPDATE posts SET title = ${title} WHERE id = ${id}\`
	 * ```
	 */
	async sql(strings: TemplateStringsArray, ...values: unknown[]): Promise<QueryResult<any>> {
		let s = strings[0] ?? ''
		for (let i = 1; i < strings.length; i++) s += '?' + strings[i]
		return this.query(s, values)
	}

	// ─── CodeIgniter-style Active Record ─────────────────────────

	/**
	 * Insert a record.
	 *
	 * @example await db.insert('users', { name: 'Alice', email: 'a@b.com' })
	 */
	async insert(table: string, data: Record<string, any>): Promise<QueryResult> {
		const keys = Object.keys(data)
		const vals = Object.values(data)
		return this.query(
			`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
			vals
		)
	}

	/**
	 * Update records.
	 *
	 * @example
	 * await db.update('users', { name: 'Bob' }, { id: 1 })
	 * await db.update('posts', { views: 0 }, { views: ['<', 0] }) // views < 0
	 */
	async update(table: string, data: Record<string, any>, where: Record<string, any>): Promise<QueryResult> {
		const setCols = Object.keys(data).map(k => `${k} = ?`)
		const { clause, vals } = buildWhere(where)
		return this.query(`UPDATE ${table} SET ${setCols.join(', ')} WHERE ${clause}`, [...Object.values(data), ...vals])
	}

	/**
	 * Delete records.
	 *
	 * @example await db.delete('users', { id: 1 })
	 * @example await db.delete('posts', { createdAt: ['<', '2024-01-01'] })
	 */
	async delete(table: string, where: Record<string, any>): Promise<QueryResult> {
		const { clause, vals } = buildWhere(where)
		return this.query(`DELETE FROM ${table} WHERE ${clause}`, vals)
	}

	/**
	 * Select records with ordering and limits.
	 *
	 * @example
	 * const all = await db.get('users')
	 * const user = await db.get('users', { id: 1 })
	 * const recent = await db.get('posts', { status: 'published' }, { orderBy: 'created_at DESC', limit: 10 })
	 * const admins = await db.get('users', { role: 'admin', age: ['>=', 18] })
	 */
	async get<T = any>(table: string, where?: Record<string, any> | null, options?: {
		orderBy?: string
		limit?: number
		offset?: number
	}): Promise<T[]> {
		let sql = `SELECT * FROM ${table}`
		const params: unknown[] = []

		if (where && Object.keys(where).length > 0) {
			const r = buildWhere(where)
			sql += ` WHERE ${r.clause}`
			params.push(...r.vals)
		}
		if (options?.orderBy) sql += ` ORDER BY ${options.orderBy}`
		if (options?.limit) { sql += ' LIMIT ?'; params.push(options.limit) }
		if (options?.offset) { sql += ' OFFSET ?'; params.push(options.offset) }

		const result = await this.query<T>(sql, params)
		return result.rows
	}

	async query<T = any>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
		this.assertOpen()
		if (!this.rawExecutor) {
			throw new Error(`[db] dialect "${this.dialect}" does not support raw queries`)
		}
		const start = performance.now()
		const result = await this.rawExecutor.query(sql, params)
		const duration = performance.now() - start

		// Log to debug toolbar if active
		try {
			const ctx = getRequestContext()
			if (ctx) {
				const { getStore } = await import('../helpers/debug')
				const data = getStore(ctx)
				data.queries.push({
					id: data.queries.length + 1,
					sql,
					duration: Math.round(duration * 100) / 100,
					rows: result.rows.length,
					params,
					time: new Date().toLocaleTimeString(),
				})
			}
		} catch {}

		return result
	}

	/**
	 * Execute a query and return the first row.
	 */
	async first<T = any>(sql: string, params: unknown[] = []): Promise<T | null> {
		const result = await this.query<T>(sql, params)
		return result.rows[0] ?? null
	}

	/**
	 * Execute a query and return all rows.
	 */
	async all<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
		const result = await this.query<T>(sql, params)
		return result.rows
	}

	// ─── Transactions ────────────────────────────────────────────

	/**
	 * Execute a callback within an ACID transaction.
	 *
	 * @example
	 * ```ts
	 * const user = await db.transaction(async (tx) => {
	 *   const [u] = await tx.query("INSERT INTO users (name) VALUES (?) RETURNING *", ['Bob'])
	 *   await tx.query("INSERT INTO logs (action) VALUES (?)", ['created_user'])
	 *   return u
	 * })
	 * ```
	 */
	async transaction<T>(fn: (tx: TxClient) => Promise<T>): Promise<T> {
		this.assertOpen()
		return this.client.transaction(async (tx: any) => {
			const txClient = Object.create(this) as TxClient
			Object.defineProperty(txClient, 'client', { value: tx, writable: false })
			// Build a temporary raw executor from the tx client if needed
			Object.defineProperty(txClient, 'rawExecutor', {
				value: this.rawExecutor,
				writable: false
			})
			return fn(txClient)
		})
	}

	// ─── Lifecycle ───────────────────────────────────────────────

	async close(): Promise<void> {
		if (!this.opened) return
		await this.client?.close?.()
		this.opened = false
	}

	// ─── Internal ────────────────────────────────────────────────

	private assertOpen(): void {
		if (!this.opened) {
			throw new Error('[db] not opened. Call await db.open() first.')
		}
	}
}

/** Transaction client — same interface as DbClient. */
export type TxClient = DbClient

// ─── Driver resolution ──────────────────────────────────────────

interface RawExecutor {
	query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>>
}

interface DriverResult {
	db: any
	rawExecutor?: RawExecutor
}

/** Build WHERE clause with operator support. */
function buildWhere(where: Record<string, any>): { clause: string; vals: unknown[] } {
	const parts: string[] = []
	const vals: unknown[] = []

	for (const [key, val] of Object.entries(where)) {
		if (Array.isArray(val)) {
			const op = val[0] ?? '='
			const v = val[1] ?? val[0]
			if (op.toUpperCase() === 'IN') {
				const items = Array.isArray(v) ? v : [v]
				parts.push(`${key} IN (${items.map(() => '?').join(', ')})`)
				vals.push(...items)
			} else {
				parts.push(`${key} ${op} ?`)
				vals.push(v)
			}
		} else {
			parts.push(`${key} = ?`)
			vals.push(val)
		}
	}

	return { clause: parts.join(' AND '), vals }
}

async function resolveDriver(dialect: Dialect, config: DbConfig): Promise<DriverResult> {
	const conn = config.connection

	switch (dialect) {
		case 'postgres': {
			const drizzleMod = await import('drizzle-orm/postgres-js')
			const postgres = await import('postgres')
			const sql = postgres.default({
				host: conn.host ?? 'localhost',
				port: conn.port ?? 5432,
				user: conn.user,
				password: conn.password,
				database: conn.database,
				...(conn as any)
			})
			const db = drizzleMod.drizzle(sql, { logger: config.logging as any })
			const rawExecutor: RawExecutor = {
				async query<T>(querySql: string, params: unknown[] = []) {
					const rows = await sql.unsafe(querySql, params as any[])
					return {
						rows: rows as T[],
						affectedRows: rows.length
					}
				}
			}
			return { db, rawExecutor }
		}

		case 'bun-sqlite': {
			const drizzleMod = await import('drizzle-orm/bun-sqlite')
			const { Database } = await import('bun:sqlite')
			const filename = (conn as any).filename ?? 'app.db'
			const sqlite = new Database(filename)
			const db = drizzleMod.drizzle(sqlite, { logger: config.logging as any })
			const rawExecutor: RawExecutor = {
				async query<T>(querySql: string, params: unknown[] = []) {
					const stmt = sqlite.prepare(querySql)
					const isSelect = /^\s*(select|pragma|with)\b/i.test(querySql)
					if (isSelect) {
						const rows = stmt.all(...params)
						return { rows: rows as T[], affectedRows: 0 }
					}
					const r = stmt.run(...params)
					return {
						rows: [],
						affectedRows: Number(r.changes ?? 0),
						insertId: r.lastInsertRowid as number | string
					}
				}
			}
			return { db, rawExecutor }
		}

		case 'sqlite': {
			const drizzleMod = await import('drizzle-orm/better-sqlite3')
			const sqliteMod = await import('better-sqlite3')
			const Database = (sqliteMod as any).default ?? sqliteMod
			const filename = (conn as any).filename ?? 'app.db'
			const sqlite = new Database(filename)
			const db = drizzleMod.drizzle(sqlite, { logger: config.logging as any })
			const rawExecutor: RawExecutor = {
				async query<T>(querySql: string, params: unknown[] = []) {
					const stmt = sqlite.prepare(querySql)
					const isSelect = /^\s*(select|pragma|with)\b/i.test(querySql)
					if (isSelect) {
						const rows = stmt.all(...params)
						return { rows: rows as T[], affectedRows: 0 }
					}
					const r = stmt.run(...params)
					return {
						rows: [],
						affectedRows: Number(r.changes ?? 0),
						insertId: r.lastInsertRowid as number | string
					}
				}
			}
			return { db, rawExecutor }
		}

		case 'mysql': {
			const drizzleMod = await import('drizzle-orm/mysql2')
			const mysqlMod = await import('mysql2/promise')
			const pool = (mysqlMod as any).createPool({
				host: conn.host ?? 'localhost',
				port: conn.port ?? 3306,
				user: conn.user,
				password: conn.password,
				database: conn.database,
				...(conn as any)
			})
			const db = drizzleMod.drizzle(pool, { logger: config.logging as any })
			const rawExecutor: RawExecutor = {
				async query<T>(querySql: string, params: unknown[] = []) {
					const [rows] = await pool.query(querySql, params as any[])
					return { rows: rows as T[], affectedRows: (rows as any[])?.length ?? 0 }
				}
			}
			return { db, rawExecutor }
		}

		case 'd1': {
			const drizzleMod = await import('drizzle-orm/d1')
			const binding = conn.binding as any
			if (!binding) throw new Error('D1 driver requires connection.binding')
			const db = drizzleMod.drizzle(binding, { logger: config.logging as any })
			const rawExecutor: RawExecutor = {
				async query<T>(querySql: string, params: unknown[] = []) {
					const stmt = binding.prepare(querySql)
					if (params.length > 0) stmt.bind(...params)
					const result = await stmt.run()
					return { rows: (result as any)?.results ?? [], affectedRows: result.meta?.changes ?? 0 }
				}
			}
			return { db, rawExecutor }
		}

		default:
			throw new Error(`[db] unsupported dialect: ${dialect}`)
	}
}
