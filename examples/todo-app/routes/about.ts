/**
 * About page controller — renders the MDX About view with live data.
 *
 * GET /about → renders views/About.mdx with {{ variable }} interpolation
 */
import { Controller } from 'bunigniter'

export class About extends Controller {
	async index() {
		let total = 0, active = 0, completed = 0

		try {
			const todos = await this.db.query('SELECT * FROM todos')
			const rows = todos.rows as any[]
			total = rows.length
			completed = rows.filter(t => t.completed).length
			active = total - completed
		} catch {}

		return this.view('About', {
			title: 'About Todo App',
			total,
			active,
			completed,
			uptime: `${Math.floor(process.uptime())}s`,
			generatedAt: new Date().toLocaleString(),
		})
	}
}
