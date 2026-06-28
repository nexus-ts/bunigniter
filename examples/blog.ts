/**
 * Blog example — demonstrates Bunigniter features.
 *
 * To run: `cd examples/blog && bun run dev`
 *
 * Routes:
 *   GET  /api/posts       → list posts
 *   GET  /api/posts/:id   → show post
 *   POST /api/posts       → create post (requires auth)
 *   POST /api/auth        → login
 *   GET  /api/auth/me     → current user
 *
 * Run with:
 * ```bash
 * cd examples/blog
 * bun install
 * bun run db/seed
 * bun run dev
 * ```
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DATA_DIR = join(import.meta.dirname, '..', 'data')

interface Post {
	id: number
	title: string
	content: string
	author: string
	createdAt: string
}

function getDb(): { posts: Post[] } {
	if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
	const path = join(DATA_DIR, 'posts.json')
	if (!existsSync(path)) {
		writeFileSync(path, JSON.stringify({ posts: [] }), 'utf-8')
	}
	return JSON.parse(readFileSync(path, 'utf-8'))
}

function saveDb(db: { posts: Post[] }): void {
	writeFileSync(join(DATA_DIR, 'posts.json'), JSON.stringify(db, null, 2), 'utf-8')
}

export class Posts {
	async index() {
		const db = getDb()
		const { Controller } = await import('../../src/base/controller')
		const ctrl = Object.create(Controller.prototype)
		return ctrl.json(db.posts.reverse())
	}

	async show(id: number) {
		const db = getDb()
		const post = db.posts.find(p => p.id === id)
		const { Controller } = await import('../../src/base/controller')
		const ctrl = Object.create(Controller.prototype)
		if (!post) {
			return ctrl.notFound('Post not found')
		}
		return ctrl.json(post)
	}

	async create() {
		const { Controller } = await import('../../src/base/controller')
		const ctrl = Object.create(Controller.prototype)

		// In a real app, auth is checked via this.auth
		const { title, content, author } = (this as any).body ?? {}
		if (!title || !content) {
			return ctrl.badRequest({ title: 'required', content: 'required' })
		}

		const db = getDb()
		const post: Post = {
			id: Date.now(),
			title,
			content,
			author: author ?? 'anonymous',
			createdAt: new Date().toISOString(),
		}
		db.posts.push(post)
		saveDb(db)
		return ctrl.json(post, 201)
	}
}
