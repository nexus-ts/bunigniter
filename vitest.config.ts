import { defineConfig } from 'vitest/config'
import { join } from 'node:path'

const root = join(import.meta.dirname)

export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		exclude: ['node_modules'],
		testTimeout: 10000,
	},
	resolve: {
		alias: {
			'@': root,
		},
	},
})
