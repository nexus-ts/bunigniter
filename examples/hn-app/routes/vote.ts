/**
 * Vote — upvote a story.
 *
 * POST /vote/:id
 */
import { Controller } from 'bunigniter'

export class Vote extends Controller {
	async create(id: number) {
		const user = this.auth.user()
		if (!user) return this.redirect('/login')

		try {
			await this.db.query(
				'INSERT OR IGNORE INTO votes (user_id, story_id) VALUES (?, ?)',
				[user.id, id]
			)
			await this.db.query(
				'UPDATE stories SET points = (SELECT count(*) FROM votes WHERE story_id = ?) WHERE id = ?',
				[id, id]
			)
		} catch {}

		return this.redirect('/')
	}
}
