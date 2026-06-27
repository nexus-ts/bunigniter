/**
 * Todo Controller — full CRUD with Inertia-style page rendering.
 *
 * Routes:
 *   GET    /          → List todos (HTML page or JSON)
 *   POST   /          → Create todo
 *   PUT    /:id       → Update todo (toggle completed / edit title)
 *   DELETE /:id       → Delete todo
 */
import { Controller } from '../../../src/base/index'

interface Todo {
	id: number
	title: string
	completed: boolean
	priority: 'high' | 'medium' | 'low'
	created_at: string
	updated_at: string
}

export class Todos extends Controller {
	/**
	 * GET / — List all todos.
	 *
	 * Supports query params:
	 *   ?filter=active|completed  — filter by status
	 *   ?priority=high|medium|low — filter by priority
	 *   ?q=search                 — search in title
	 */
	async index() {
		const filter = this.ctx.query?.filter as string ?? 'all'
		const priority = this.ctx.query?.priority as string ?? ''
		const search = this.ctx.query?.q as string ?? ''

		let where = 'WHERE 1=1'
		const params: unknown[] = []

		if (filter === 'active') {
			where += ' AND completed = 0'
		} else if (filter === 'completed') {
			where += ' AND completed = 1'
		}

		if (priority && ['high', 'medium', 'low'].includes(priority)) {
			where += ' AND priority = ?'
			params.push(priority)
		}

		if (search) {
			where += ' AND title LIKE ?'
			params.push(`%${search}%`)
		}

		const todos = await this.db.query<Todo>(
			`SELECT * FROM todos ${where} ORDER BY
				CASE priority
					WHEN 'high' THEN 1
					WHEN 'medium' THEN 2
					WHEN 'low' THEN 3
				END,
				created_at DESC`,
			params
		)

		// Stats
		const total = todos.rows.length
		const completed = todos.rows.filter(t => t.completed).length
		const active = total - completed

		// Determine the page title
		let title = 'Todo App'
		if (filter === 'active') title = 'Active Tasks'
		else if (filter === 'completed') title = 'Completed Tasks'
		if (search) title = `Search: "${search}"`

		return this.view('TodoList', {
			title,
			todos: todos.rows,
			stats: { total, completed, active },
			filter,
			priority,
		})
	}

	/**
	 * POST / — Create a new todo.
	 */
	async create() {
		const v = this.validate(this.body, {
			title: 'required|min:1|max:500',
			priority: 'required',
		})
		if (v.fails()) {
			return this.badRequest(v.errors)
		}

		const priority = v.data.priority
		if (!['high', 'medium', 'low'].includes(priority)) {
			return this.badRequest({ priority: ['Must be high, medium, or low'] })
		}

		await this.db.query(
			'INSERT INTO todos (title, priority) VALUES (?, ?)',
			[v.data.title.trim(), priority]
		)

		return this.redirect('/todos')
	}

	/**
	 * PUT /:id — Update a todo (toggle or edit).
	 *
	 * Body:
	 *   { completed: true }         → toggle status
	 *   { title: "new title" }      → edit title
	 *   { priority: "high" }        → change priority
	 */
	async update(id: number) {
		const existing = await this.db.first<Todo>(
			'SELECT * FROM todos WHERE id = ?', [id]
		)
		if (!existing) return this.notFound('Todo not found')

		const body = this.body
		const updates: string[] = []
		const params: unknown[] = []

		if (body.title !== undefined) {
			if (typeof body.title !== 'string' || body.title.trim().length === 0) {
				return this.badRequest({ title: ['Title cannot be empty'] })
			}
			updates.push('title = ?')
			params.push(body.title.trim())
		}

		if (body.completed !== undefined) {
			updates.push('completed = ?')
			params.push(body.completed ? 1 : 0)
		}

		if (body.priority !== undefined) {
			if (!['high', 'medium', 'low'].includes(body.priority)) {
				return this.badRequest({ priority: ['Must be high, medium, or low'] })
			}
			updates.push('priority = ?')
			params.push(body.priority)
		}

		if (updates.length === 0) {
			return this.badRequest({ _: ['No fields to update'] })
		}

		updates.push("updated_at = datetime('now')")
		params.push(id)

		await this.db.query(
			`UPDATE todos SET ${updates.join(', ')} WHERE id = ?`,
			params
		)

		return this.redirect('/todos')
	}

	/**
	 * DELETE /:id — Delete a todo.
	 */
	async destroy(id: number) {
		const existing = await this.db.first<Todo>(
			'SELECT * FROM todos WHERE id = ?', [id]
		)
		if (!existing) return this.notFound('Todo not found')

		await this.db.query('DELETE FROM todos WHERE id = ?', [id])
		return this.redirect('/todos')
	}
}
