/**
 * Loader for the dashboard page.
 *
 * This runs on the server and returns props for the page component.
 * Props are accessible as `c.db` from the Elysia context.
 */
export type DashboardProps = {
	stats: {
		users: number
		uptime: string
		timestamp: string
	}
}

export const loader = async (ctx: any): Promise<DashboardProps> => {
	// db is injected by the framework via app.decorate('db', db)
	const db = (ctx as any).db
	let userCount = 0

	if (db) {
		try {
			const result = await db.query('SELECT count(*) as count FROM users')
			userCount = result.rows[0]?.count ?? 0
		} catch {
			// Table may not exist
		}
	}

	return {
		stats: {
			users: userCount,
			uptime: `${Math.floor(process.uptime())}s`,
			timestamp: new Date().toISOString(),
		}
	}
}
