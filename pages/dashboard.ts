/**
 * Dashboard page — demonstrates Inertia-style page rendering.
 *
 * GET  /api/dashboard → renders full HTML page (first request)
 *                      → returns JSON (Inertia navigation)
 */
import { Controller } from '../src/base/index'

interface Stats {
	totalUsers: number
	activeToday: number
	serverUptime: string
}

export class Dashboard extends Controller {
	async index() {
		const db = this.db
		let totalUsers = 0

		if (db) {
			try {
				const result = await db.query('SELECT count(*) as count FROM users')
				totalUsers = result.rows[0]?.count ?? 0
			} catch {
				// Table may not exist
			}
		}

		const stats: Stats = {
			totalUsers,
			activeToday: Math.floor(totalUsers * 0.7),
			serverUptime: `${Math.floor(process.uptime())}s`,
		}

		// Render a full page with Inertia-style protocol
		return this.page('Dashboard/Index', { stats }, {
			title: 'Dashboard',
			flash: { type: 'info', message: 'Welcome to the dashboard!' },
		})
	}
}
