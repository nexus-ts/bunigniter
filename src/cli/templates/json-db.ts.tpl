/**
 * JSON data store — in-memory storage for demo/DB-less mode.
 * Data resets on server restart.
 */
interface StoreItem { id: number; [key: string]: any }

const stores = new Map<string, StoreItem[]>()
const counters = new Map<string, number>()

export function jsonDb(table: string) {
	if (!stores.has(table)) { stores.set(table, []); counters.set(table, 1) }
	const items = stores.get(table)!
	let counter = counters.get(table)!

	return {
		all<T = StoreItem>(): T[] { return items as T[] },
		get<T = StoreItem>(id: number): T | undefined { return items.find(i => i.id === id) as T },
		insert(data: Record<string, any>): StoreItem {
			const item = { id: counter++, ...data, created_at: new Date().toISOString() }
			items.push(item); counters.set(table, counter); return item
		},
		update(id: number, data: Record<string, any>): StoreItem | null {
			const idx = items.findIndex(i => i.id === id)
			if (idx === -1) return null
			items[idx] = { ...items[idx], ...data }; return items[idx]
		},
		delete(id: number): boolean {
			const idx = items.findIndex(i => i.id === id)
			if (idx === -1) return false
			items.splice(idx, 1); return true
		},
		count(): number { return items.length },
	}
}

export function seedTodos() {
	const db = jsonDb("todos")
	if (db.count() > 0) return
	db.insert({ title: "Learn Bunigniter", completed: false })
	db.insert({ title: "Build an app", completed: false })
	db.insert({ title: "Deploy to production", completed: false })
	db.insert({ title: "Done task", completed: true })
}
