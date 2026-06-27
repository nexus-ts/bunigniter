/**
 * Pagination — CodeIgniter-style pagination helper.
 *
 * Wraps query results with pagination metadata.
 *
 * @example
 * ```ts
 * const result = await this.db.paginate('SELECT * FROM users', { page: 1, perPage: 20 })
 * // → { data: User[], total: 100, page: 1, perPage: 20, pages: 5 }
 * ```
 */
export interface PaginateOptions {
	/** Current page (1-indexed). Default: 1 */
	page?: number

	/** Items per page. Default: 20 */
	perPage?: number

	/** Base URL for generated links. */
	baseUrl?: string
}

export interface PaginateResult<T = any> {
	/** Page items. */
	data: T[]

	/** Total items across all pages. */
	total: number

	/** Current page number. */
	page: number

	/** Items per page. */
	perPage: number

	/** Total pages. */
	pages: number

	/** Is this the first page? */
	firstPage: boolean

	/** Is this the last page? */
	lastPage: boolean

	/** Count of items on current page. */
	count: number

	/** Previous page number (null if first). */
	prevPage: number | null

	/** Next page number (null if last). */
	nextPage: number | null

	/** Generated pagination links (simple HTML). */
	links: string
}

/**
 * Wrap an array with pagination metadata.
 *
 * @param data - Items for the current page
 * @param total - Total items across all pages
 * @param options - Pagination options
 *
 * @example
 * ```ts
 * const result = paginate(rows, totalCount, { page: 1, perPage: 20 })
 * ```
 */
export function paginate<T = any>(
	data: T[],
	total: number,
	options: PaginateOptions = {}
): PaginateResult<T> {
	const page = Math.max(1, options.page ?? 1)
	const perPage = Math.max(1, options.perPage ?? 20)
	const pages = Math.max(1, Math.ceil(total / perPage))
	const currentPage = Math.min(page, pages)

	return {
		data,
		total,
		page: currentPage,
		perPage,
		pages,
		firstPage: currentPage === 1,
		lastPage: currentPage === pages,
		count: data.length,
		prevPage: currentPage > 1 ? currentPage - 1 : null,
		nextPage: currentPage < pages ? currentPage + 1 : null,
		links: generateLinks(total, currentPage, pages, options.baseUrl ?? ''),
	}
}

/**
 * Generate simple HTML pagination links.
 */
function generateLinks(total: number, page: number, pages: number, baseUrl: string): string {
	if (pages <= 1) return ''

	const prev = page > 1 ? `<a href="${baseUrl}?page=${page - 1}">&laquo; Prev</a>` : '<span>&laquo; Prev</span>'
	const next = page < pages ? `<a href="${baseUrl}?page=${page + 1}">Next &raquo;</a>` : '<span>Next &raquo;</span>'

	let numbers = ''
	const start = Math.max(1, page - 2)
	const end = Math.min(pages, page + 2)

	for (let i = start; i <= end; i++) {
		if (i === page) {
			numbers += `<strong>${i}</strong> `
		} else {
			numbers += `<a href="${baseUrl}?page=${i}">${i}</a> `
		}
	}

	return `<div class="pagination">${prev} ${numbers} ${next}</div>`
}

/**
 * Add paginate helper to DbClient prototype.
 * Usage: `this.db.paginate('SELECT * FROM users', [], { page: 1, perPage: 20 })`
 */
export function addPaginationToDb(db: any): void {
	if (!db || db._paginateAdded) return
	db._paginateAdded = true

	/**
	 * Execute a paginated query.
	 *
	 * @param sql - SQL query (without LIMIT/OFFSET)
	 * @param params - Query parameters
	 * @param options - Pagination options
	 */
	db.paginate = async function <T = any>(
		sql: string,
		params: unknown[] = [],
		options: PaginateOptions = {}
	): Promise<PaginateResult<T>> {
		const page = Math.max(1, options.page ?? 1)
		const perPage = Math.max(1, options.perPage ?? 20)
		const offset = (page - 1) * perPage

		// Count total
		const countSql = `SELECT count(*) as count FROM (${sql}) _count`
		const countResult = await this.query(countSql, params)
		const total = Number(countResult.rows[0]?.count ?? 0)

		// Fetch page
		const pageSql = dialectLimitOffset(sql, perPage, offset)
		const dataResult = await this.query<T>(pageSql, params)

		return paginate(dataResult.rows, total, { page, perPage })
	}
}

/** Add LIMIT/OFFSET for different dialects. */
function dialectLimitOffset(sql: string, limit: number, offset: number): string {
	return `${sql} LIMIT ${limit} OFFSET ${offset}`
}
