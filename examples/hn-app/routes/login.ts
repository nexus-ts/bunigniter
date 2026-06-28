/**
 * Login — simple username/password auth.
 *
 * GET  /login → show login form
 * POST /login → authenticate
 */
import { Controller } from 'bunigniter'

export class Login extends Controller {
	async index() {
		if (this.auth.check()) return this.redirect('/')
		return this.view('login', { title: 'Login', flash: null, user: null })
	}

	async create() {
		const v = this.validate(this.body, {
			username: 'required|min:2',
			password: 'required|min:3',
		})
		if (v.fails()) {
			return this.view('login', {
				title: 'Login', flash: 'Invalid input', flashType: 'flash-error', user: null,
			})
		}

		const user = await this.db.first<any>(
			'SELECT * FROM users WHERE username = ? AND password = ?',
			[v.data.username, v.data.password]
		)

		if (!user) {
			return this.view('login', {
				title: 'Login', flash: 'Invalid username or password', flashType: 'flash-error', user: null,
			})
		}

		this.auth.login({ id: user.id, username: user.username })
		return this.redirect('/')
	}
}
