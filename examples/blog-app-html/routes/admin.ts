import { Controller } from '@nexusts/core'

export class Admin extends Controller {
	protected _before(): Response | undefined {
		if (!this.auth.check()) return this.redirect('/login')
	}

	async index() {
		const posts = await this.db.all('SELECT p.*, u.username FROM posts p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC')
		return this.view('admin', { title: 'Admin', posts, user: this.auth.user() })
	}

	async show(id: number) {
		const post = id === 0 ? null : await this.db.first('SELECT * FROM posts WHERE id = ?', [id])
		return this.view('edit', { title: post ? 'Edit Post' : 'New Post', post, user: this.auth.user() })
	}

	async create() {
		const v = this.validate(this.body, { title: 'required' })
		if (v.fails()) return this.redirect('/admin')
		const slug = this.body?.slug || v.data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
		const user = this.auth.user()!
		await this.db.insert('posts', {
			title: v.data.title,
			slug,
			content: this.body?.content || '',
			excerpt: this.body?.excerpt || '',
			user_id: user.id,
		})
		return this.redirect('/admin')
	}

	async update(id: number) {
		await this.db.update('posts', {
			title: this.body?.title,
			slug: this.body?.slug,
			content: this.body?.content || '',
			excerpt: this.body?.excerpt || '',
		}, { id })
		return this.redirect('/admin')
	}
}
