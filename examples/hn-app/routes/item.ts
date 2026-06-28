/**
 * Item — story detail with comments.
 *
 * GET  /item/:id → show story + comments
 * POST /item/:id → add comment
 */
import { Controller } from 'bunigniter'

function timeago(dateStr: string): string {
	const d = new Date(dateStr + 'Z')
	const diff = (Date.now() - d.getTime()) / 1000
	if (diff < 60) return 'just now'
	if (diff < 3600) return Math.floor(diff / 60) + ' minutes ago'
	if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago'
	return Math.floor(diff / 86400) + ' days ago'
}

interface Story {
	id: number; title: string; url: string | null; text: string | null
	user_id: number; username: string; points: number; comment_count: number; created_at: string
}

interface Comment {
	id: number; story_id: number; parent_id: number | null
	user_id: number; username: string; text: string; created_at: string
}

export class Item extends Controller {
	async show(id: number) {
		const story = await this.db.first<Story>(`
			SELECT s.*, u.username,
				(SELECT count(*) FROM comments c WHERE c.story_id = s.id) as comment_count
			FROM stories s JOIN users u ON u.id = s.user_id
			WHERE s.id = ?
		`, [id])

		if (!story) return this.notFound('Story not found')

		const comments = await this.db.query<Comment>(`
			SELECT c.*, u.username
			FROM comments c JOIN users u ON u.id = c.user_id
			WHERE c.story_id = ?
			ORDER BY c.created_at ASC
		`, [id])

		const user = this.auth.check() ? this.auth.user() : null

		const storyData = {
			...story,
			timeAgo: timeago(story.created_at),
			host: story.url ? new URL(story.url).hostname.replace('www.', '') : null,
		}

		const commentList = comments.rows.map(c => ({
			...c,
			timeAgo: timeago(c.created_at),
		}))

		return this.view('item', {
			title: story.title,
			story: storyData,
			comments: commentList,
			user,
			currentUserId: user?.id ?? null,
		})
	}

	async create(id: number) {
		const user = this.auth.user()
		if (!user) return this.redirect('/login')

		const v = this.validate(this.body, { text: 'required|min:1' })
		if (v.fails()) return this.redirect(`/item/${id}`)

		await this.db.query(
			'INSERT INTO comments (story_id, user_id, text) VALUES (?, ?, ?)',
			[id, user.id, v.data.text]
		)

		return this.redirect(`/item/${id}`)
	}
}
