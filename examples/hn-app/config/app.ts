import { env } from '@nexusts/core/helpers/env'

export default {
	port: env('PORT', 3000),

	db: {
		dialect: 'bun-sqlite' as const,
		connection: { filename: env('DB_FILENAME', 'data/hn.db') },
	},

	router: { prefix: '', directory: 'routes' },

	view: { directory: 'views' },

	middleware: {
		cors: { origin: '*', credentials: true },
		logger: { enabled: true, showQuery: true },
	},
}
