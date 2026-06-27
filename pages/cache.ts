/**
 * Cache example — demonstrates cache usage.
 *
 * GET /api/cache/stats  → cache stats
 * GET /api/cache/hello  → cached "Hello World"
 */
import { Controller } from '../src/base/index'

export class Cache extends Controller {
	/** GET /api/cache — demonstrate cache */
	async index() {
		// Cache.remember() — get or set
		const value = await this.cache.remember('demo_hello', 30, async () => {
			return { message: 'Hello from cache!', generatedAt: new Date().toISOString() }
		})

		return this.json({
			cached: value,
			cacheSize: (this.cache as any).size ?? 'N/A',
		})
	}

	/** POST /api/cache — set a value */
	async create() {
		const { key, value, ttl } = this.body
		if (!key) return this.badRequest({ key: 'required' })
		this.cache.set(key, value ?? 'cached_value', ttl ?? 60)
		return this.json({ message: 'Cached', key, ttl: ttl ?? 60 })
	}

	/** DELETE /api/cache/:id — delete a cached key */
	async destroy(id: string) {
		this.cache.delete(id)
		return this.json({ message: 'Deleted', key: id })
	}
}
