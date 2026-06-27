/**
 * Auth controller — login/logout example.
 *
 * GET  /api/auth/me    → current user (from session)
 * POST /api/auth/login → login with email
 * POST /api/auth/logout → clear session
 */
import { Controller } from '../src/base/index'

export class Auth extends Controller {
	/** GET /api/auth/me — return current user from session */
	async index() {
		const user = this.auth.user()
		if (!user) {
			return this.json({ authenticated: false }, 200)
		}
		return this.json({ authenticated: true, user })
	}

	/** POST /api/auth/login — simple email-based login */
	async create() {
		const v = this.validate(this.body, {
			email: 'required|email',
			name: 'required|min:1',
		})
		if (v.fails()) return this.badRequest(v.errors)

		// In production, verify against DB
		const user = { id: 1, email: v.data.email, name: v.data.name }
		this.auth.login(user)

		return this.json({ message: 'Logged in', user })
	}

	/** POST /api/auth/logout */
	async destroy() {
		this.auth.logout()
		return this.json({ message: 'Logged out' })
	}
}
