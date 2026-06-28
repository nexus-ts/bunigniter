/**
 * Submit — post a new story.
 *
 * GET  /submit → show form
 * POST /submit → create story
 */
import { Controller } from '@nexusts/core'

export class Submit extends Controller {
	async index() {
		const user = this.auth.user()
		if (!user) return this.redirect('/login')
		return this.view('submit', { title: 'Submit', user, flash: null })
	}

	async create() {
		const user = this.auth.user()
		if (!user) return this.redirect('/login')

		const v = this.validate(this.body, { title: 'required|min:2' })
		if (v.fails()) {
			return this.view('submit', { title: 'Submit', user, flash: 'Title is required' })
		}

		const title = v.data.title
		const url = (this.body?.url as string)?.trim() || ''
		const text = (this.body?.text as string)?.trim() || ''

		if (!url && !text) {
			return this.view('submit', { title: 'Submit', user, flash: 'Provide url or text' })
		}

		await this.db.query(
			'INSERT INTO stories (title, url, text, user_id) VALUES (?, ?, ?, ?)',
			[title, url || null, text || null, user.id]
		)

		return this.redirect('/')
	}
}
