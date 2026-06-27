/**
 * Welcome page — PHP-style Rendu template.
 *
 * GET /welcome → renders views/welcome.html with Rendu <?= ?> syntax
 */
import { Controller } from '../../../src/base/index'

export class Welcome extends Controller {
	async index() {
		let total = 0

		try {
			const todos = await this.db.query('SELECT count(*) as count FROM todos')
			total = Number(todos.rows[0]?.count ?? 0)
		} catch {}

		return this.view('welcome', {
			title: 'Welcome to NexusTS',
			message: 'A full-stack framework inspired by CodeIgniter',
			total,
			uptime: `${Math.floor(process.uptime())}s`,
			generatedAt: new Date().toLocaleString(),
		})
	}
}
