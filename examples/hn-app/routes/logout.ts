/**
 * Logout — clears session and redirects home.
 *
 * GET /logout
 */
import { Controller } from 'bunigniter'

export class Logout extends Controller {
	async index() {
		this.auth.logout()
		return this.redirect('/')
	}
}
