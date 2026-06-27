/**
 * Todo App — configuration.
 *
 * SQLite database with page rendering (Inertia-style).
 */
import { env } from '../../../src/helpers/env'

export default {
	port: env('PORT', 3000),

	db: {
		dialect: env('DB_DIALECT', 'bun-sqlite') as 'bun-sqlite',
		connection: {
			filename: env('DB_FILENAME', 'data/todo.db'),
		},
	},

	router: {
		prefix: '',
		directory: 'routes',
	},

	view: {
		directory: 'views',
		scripts: [],
	},

	middleware: {
		cors: { origin: '*', credentials: true },
		logger: { enabled: true, showQuery: true },
	},
}
