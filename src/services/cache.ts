/**
 * Cache — CodeIgniter-style key-value cache with TTL support.
 *
 * @example
 * ```ts
 * // In a controller
 * const users = this.cache.get('users_list')
 * if (!users) {
 *   const data = await this.db.query('SELECT * FROM users')
 *   this.cache.set('users_list', data, 300) // 5 min TTL
 * }
 * ```
 */
export interface CacheOptions {
	/** Default TTL in seconds. Default: 60 */
	defaultTtl?: number

	/** Max cache entries. Default: 1000 */
	maxEntries?: number
}

interface CacheEntry {
	data: any
	expiresAt: number
}

/** In-memory cache store. */
const store = new Map<string, CacheEntry>()

/** Periodic cleanup. */
let cleanupTimer: Timer | null = null
function ensureCleanup(interval = 30000) {
	if (cleanupTimer) return
	cleanupTimer = setInterval(() => {
		const now = Date.now()
		for (const [key, entry] of store) {
			if (entry.expiresAt <= now) store.delete(key)
		}
	}, interval)
}

/**
 * Cache service — get/set/delete/remember with TTL.
 *
 * Usage in a Controller (injected by the framework):
 * ```ts
 * this.cache.get('key')
 * this.cache.set('key', value, 300)
 * ```
 */
export class Cache {
	private defaultTtl: number
	private maxEntries: number

	constructor(options: CacheOptions = {}) {
		this.defaultTtl = options.defaultTtl ?? 60
		this.maxEntries = options.maxEntries ?? 1000
		ensureCleanup()
	}

	/**
	 * Get a cached value.
	 * Returns undefined if key doesn't exist or is expired.
	 */
	get<T = any>(key: string): T | undefined {
		const entry = store.get(key)
		if (!entry) return undefined
		if (entry.expiresAt <= Date.now()) {
			store.delete(key)
			return undefined
		}
		return entry.data as T
	}

	/**
	 * Set a cached value with optional TTL.
	 *
	 * @param key - Cache key
	 * @param value - Value to store
	 * @param ttl - Time to live in seconds. Default: config.defaultTtl
	 */
	set(key: string, value: any, ttl?: number): void {
		if (store.size >= this.maxEntries) {
			// Evict oldest entry
			const oldest = store.entries().next().value
			if (oldest) store.delete(oldest[0])
		}

		store.set(key, {
			data: value,
			expiresAt: Date.now() + (ttl ?? this.defaultTtl) * 1000,
		})
	}

	/**
	 * Delete a cached value.
	 */
	delete(key: string): void {
		store.delete(key)
	}

	/**
	 * Clear all cached values.
	 */
	clear(): void {
		store.clear()
	}

	/**
	 * Check if a key exists and is not expired.
	 */
	has(key: string): boolean {
		const entry = store.get(key)
		if (!entry) return false
		if (entry.expiresAt <= Date.now()) {
			store.delete(key)
			return false
		}
		return true
	}

	/**
	 * Remember — get or set via a callback.
	 *
	 * @example
	 * ```ts
	 * const users = await this.cache.remember('users', 300, async () => {
	 *   return this.db.query('SELECT * FROM users')
	 * })
	 * ```
	 */
	async remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
		const cached = this.get<T>(key)
		if (cached !== undefined) return cached

		const value = await callback()
		this.set(key, value, ttl)
		return value
	}

	/**
	 * Increment a numeric value.
	 */
	increment(key: string, amount = 1): number {
		const current = this.get<number>(key) ?? 0
		const newValue = current + amount
		this.set(key, newValue)
		return newValue
	}

	/**
	 * Decrement a numeric value.
	 */
	decrement(key: string, amount = 1): number {
		return this.increment(key, -amount)
	}

	/** Number of cached entries. */
	get size(): number {
		return store.size
	}
}

/**
 * Create a shared cache instance.
 */
let _instance: Cache | null = null
export function createCache(options?: CacheOptions): Cache {
	if (!_instance) {
		_instance = new Cache(options)
	}
	return _instance
}
