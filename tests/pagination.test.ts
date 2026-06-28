/**
 * Tests for pagination helper.
 */
import { describe, it, expect } from 'vitest'
import { paginate } from '../src/helpers/pagination'

describe('pagination', () => {
	const data = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }))

	it('returns first page correctly', () => {
		const result = paginate(data.slice(0, 20), 50, { page: 1, perPage: 20 })
		expect(result.page).toBe(1)
		expect(result.pages).toBe(3)
		expect(result.total).toBe(50)
		expect(result.count).toBe(20)
		expect(result.firstPage).toBe(true)
		expect(result.lastPage).toBe(false)
		expect(result.prevPage).toBeNull()
		expect(result.nextPage).toBe(2)
	})

	it('returns last page correctly', () => {
		const result = paginate(data.slice(40), 50, { page: 3, perPage: 20 })
		expect(result.page).toBe(3)
		expect(result.firstPage).toBe(false)
		expect(result.lastPage).toBe(true)
		expect(result.prevPage).toBe(2)
		expect(result.nextPage).toBeNull()
	})

	it('clamps page number within range', () => {
		const result = paginate(data.slice(0, 20), 50, { page: 999, perPage: 20 })
		expect(result.page).toBe(3) // clamped to last page
	})

	it('generates pagination links', () => {
		const result = paginate(data.slice(0, 20), 50, { page: 2, perPage: 20, baseUrl: '/items' })
		expect(result.links).toContain('/items?page=1')
		expect(result.links).toContain('/items?page=3')
	})

	it('returns empty result for zero total', () => {
		const result = paginate([], 0, { page: 1, perPage: 20 })
		expect(result.total).toBe(0)
		expect(result.pages).toBe(1)
		expect(result.data).toEqual([])
	})
})
