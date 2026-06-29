/**
 * Todos Controller — full CRUD with Rendu views.
 *
 * GET    /todos        -> List all todos
 * POST   /todos        -> Create todo
 * POST   /todos/:id    -> Update or delete (via _method)
 */
import { Controller } from "bunigniter"

interface Todo {
	id: number
	title: string
	completed: number
	created_at: string
}

export class Todos extends Controller {
	async index() {
		const result = await this.db.query<Todo>("SELECT * FROM todos ORDER BY created_at DESC")
		const todos = result.rows ?? []
		const activeCount = todos.filter((t: Todo) => !t.completed).length
		return this.view("todos", {
			title: "Todos", todos, total: todos.length, activeCount,
		})
	}

	async create() {
		const v = this.validate(this.body, { title: "required|min:1|max:500" })
		if (v.fails()) {
			const result = await this.db.query<Todo>("SELECT * FROM todos ORDER BY created_at DESC")
			return this.view("todos", {
				title: "Todos", todos: result.rows ?? [],
				total: result.rows?.length ?? 0,
				activeCount: result.rows?.filter((t: Todo) => !t.completed).length ?? 0,
				errors: v.errors, oldTitle: this.request.post("title", ""),
			})
		}
		await this.db.query("INSERT INTO todos (title) VALUES (?)", [v.data.title.trim()])
		return this.redirect("/todos")
	}

	async update(id: number) {
		const body = this.body
		if (body?.title !== undefined) {
			const v = this.validate(body, { title: "required|min:1|max:500" })
			if (v.fails()) return this.badRequest(v.errors)
			await this.db.query("UPDATE todos SET title = ?, completed = ? WHERE id = ?", [
				v.data.title.trim(), body.completed ? 1 : 0, id,
			])
		} else {
			await this.db.query("UPDATE todos SET completed = ? WHERE id = ?", [
				body?.completed ? 1 : 0, id,
			])
		}
		return this.redirect("/todos")
	}

	async destroy(id: number) {
		await this.db.query("DELETE FROM todos WHERE id = ?", [id])
		return this.redirect("/todos")
	}
}
