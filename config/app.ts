/**
 * Application configuration — CodeIgniter-style single config file.
 *
 * Edit this file to change database, port, and router settings.
 *
 * @example
 * ```ts
 * // Minimal SQLite (auto-created)
 * export default {
 *   db: { dialect: 'bun-sqlite', connection: { filename: 'app.db' } }
 * }
 *
 * // PostgreSQL
 * export default {
 *   db: {
 *     dialect: 'postgres',
 *     connection: { host: 'localhost', port: 5432, user: 'postgres', database: 'myapp' }
 *   }
 * }
 * ```
 */
export default {
	port: 3000,
	db: {
		dialect: 'bun-sqlite',
		connection: { filename: 'app.db' }
	},
	router: {
		prefix: '/api',
		directory: 'pages'
	}
}

