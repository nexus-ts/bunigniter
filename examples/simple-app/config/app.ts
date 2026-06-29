import { env } from 'bunigniter/helpers/env'

export default {
	port: env('PORT', 3000),

	// No database needed — this is a static welcome page
	db: {
		dialect: 'bun-sqlite' as const,
		connection: { filename: ':memory:' },
	},

	router: { prefix: '', directory: 'routes' },
	view: { directory: 'views' },

	middleware: {
		cors: { origin: '*', credentials: true },
	},
}
