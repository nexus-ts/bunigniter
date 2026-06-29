/**
 * Home — welcome page controller.
 *
 * GET / -> renders welcome page
 * Just like CodeIgniter 3's default welcome page.
 */
import { Controller } from 'bunigniter'

export class Home extends Controller {
	async index() {
		return this.view('welcome', {
			title: 'Welcome',
			message: 'Your Bunigniter app is running!',
			runtime: process.versions.bun
				? `Bun ${process.versions.bun}`
				: typeof (globalThis as any).Bun !== 'undefined'
					? 'Bun'
					: 'Node.js',
		})
	}
}
