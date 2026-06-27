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
	async query<T = any>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
		this.assertOpen()
		if (!this.rawExecutor) {
			throw new Error(`[db] dialect "${this.dialect}" does not support raw queries`)
		}
		return this.rawExecutor.query(sql, params)
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

	// ─── Query Builders (Drizzle ORM) ────────────────────────────

	/** Start a SELECT query. */
	select<T = any>(fields?: any): any {
		return fields ? this.client.select(fields) : this.client.select()
	}

	/** Start an INSERT query. */
	insert(table: any): any {
		return this.client.insert(table)
	}

	/** Start an UPDATE query. */
	update(table: any): any {
		return this.client.update(table)
	}

	/** Start a DELETE query. */
	delete(table: any): any {
		return this.client.delete(table)
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
