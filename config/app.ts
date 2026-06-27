/**
 * Application configuration — CodeIgniter-style single config file.
 *
 * Edit this file to change database, port, and router settings.
 * Use `env()` to read environment variables.
 *
 * @example
 * ```ts
 * // Minimal SQLite (auto-created)
 * export default {
 *   db: { dialect: 'bun-sqlite', connection: { filename: 'app.db' } }
 * }
 *
 * // PostgreSQL via environment variables
 * export default {
 *   db: {
 *     dialect: 'postgres',
 *     connection: {
 *       host: env('DB_HOST', 'localhost'),
 *       port: env('DB_PORT', 5432),
 *       user: env('DB_USER', 'postgres'),
 *       database: env('DB_NAME', 'myapp'),
 *       password: env('DB_PASSWORD', ''),
 *     }
 *   }
 * }
 * ```
 */
import { env } from '../src/helpers/env'

export default {
	/**
	 * Server port. Reads PORT environment variable, defaults to 3000.
	 */
	port: Number(process.env.PORT) || env('PORT', 3000),

	/**
	 * Database configuration.
	 * Set DB_DIALECT env var to switch between dialects.
	 */
	db: {
		dialect: env('DB_DIALECT', 'bun-sqlite') as 'bun-sqlite' | 'postgres' | 'mysql' | 'sqlite' | 'd1',
		connection: {
			filename: env('DB_FILENAME', 'app.db'),
		},
	},

	/**
	 * Router configuration.
	 */
	router: {
		prefix: env('ROUTER_PREFIX', '/api'),
		directory: 'routes',
	},

	/**
	 * Application key — used for session encryption, CSRF, etc.
	 * Generate with: `bun -e "console.log(btoa(crypto.getRandomValues(new Uint8Array(32))))"`
	 */
	app: {
		key: env('APP_KEY', ''),
		debug: env('DEBUG', false),
	},

	/**
	 * Middleware configuration.
	 */
	middleware: {
		// CORS — allow all origins in development
		cors: {
			origin: env('CORS_ORIGIN', '*'),
			credentials: true,
		},

		// Logger — show requests in console
		logger: {
			enabled: env('DEBUG', false),
			showQuery: true,
		},

		// CSRF protection
		csrf: {
			secret: env('APP_KEY', ''),
		},

		// Rate limiter — 100 requests/minute by default
		throttle: {
			max: 100,
			window: 60000,
		},
	},
}
