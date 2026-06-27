/**
 * Users page — CRUD example
 *
 * GET  /api/users      → list all users
 * GET  /api/users/:id  → show one user
 * POST /api/users      → create a user
 * PUT  /api/users/:id  → update a user
 * DELETE /api/users/:id → delete a user
 */
import { Controller } from '../src/base/index'

interface User {
	id: number
	name: string
	email: string
}

export class Users extends Controller {
	/** GET /api/users */
	async index() {
		try {
			const result = await this.db.query<User>('SELECT * FROM users ORDER BY id DESC')
			return this.json(result.rows)
		} catch {
			return this.json([])
		}
	}

	/** GET /api/users/:id */
	async show(id: number) {
		const user = await this.db.first<User>('SELECT * FROM users WHERE id = ?', [id])
		if (!user) return this.notFound('User not found')
		return this.json(user)
	}

	/** POST /api/users */
	async create() {
		const body = this.body
		const v = this.validate(this.body, {
			name: 'required|min:1',
			email: 'required|email',
		})
		if (v.fails()) return this.badRequest(v.errors)

		const result = await this.db.query<User>(
			'INSERT INTO users (name, email) VALUES (?, ?) RETURNING *',
			[body.name, body.email]
		)
		return this.json(result.rows[0] ?? { id: result.insertId }, 201)
	}

	/** PUT /api/users/:id */
	async update(id: number) {
		const body = this.body
		if (!body) return this.badRequest('Request body required')

		const result = await this.db.query<User>(
			'UPDATE users SET name = ?, email = ? WHERE id = ? RETURNING *',
			[body.name, body.email, id]
		)
		if (result.rows.length === 0) return this.notFound('User not found')
		return this.json(result.rows[0])
	}

	/** DELETE /api/users/:id */
	async destroy(id: number) {
		const result = await this.db.query<User>(
			'DELETE FROM users WHERE id = ? RETURNING *',
			[id]
		)
		if (result.rows.length === 0) return this.notFound('User not found')
		return this.json({ deleted: true, id })
	}
}
