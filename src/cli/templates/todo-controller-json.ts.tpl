/**
 * Todos Controller — full CRUD with JSON data store.
 * No database required — data resets on server restart.
 */
import { Controller } from "bunigniter"
import { jsonDb, seedTodos } from "../helpers/json-db"

interface Todo {
	id: number
	title: string
	completed: boolean
	created_at: string
}

export class Todos extends Controller {
	async index() {
		seedTodos()
		const todos = jsonDb<Todo>("todos").all().reverse()
		const activeCount = todos.filter(t => !t.completed).length
		return this.view("todos", { title: "Todos", todos, total: todos.length, activeCount })
	}

	async create() {
		const v = this.validate(this.body, { title: "required|min:1|max:500" })
		if (v.fails()) return this.redirect("/todos")
		jsonDb("todos").insert({ title: this.request.post("title", "").trim(), completed: false })
		return this.redirect("/todos")
	}

	async update(id: number) {
		const body = this.body
		if (body?.title !== undefined) {
			jsonDb("todos").update(id, { title: body.title.trim(), completed: body.completed ? true : false })
		} else {
			jsonDb("todos").update(id, { completed: body?.completed ? true : false })
		}
		return this.redirect("/todos")
	}

	async destroy(id: number) {
		jsonDb("todos").delete(id)
		return this.redirect("/todos")
	}
}
