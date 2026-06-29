/**
 * Bunigniter Application Configuration.
 *
 * Edit this file to configure your app — all options are listed below.
 * Delete or comment out sections you don't need.
 */
import { env } from "bunigniter/helpers/env"

export default {
	// ─── Server ──────────────────────────────────────────────
	// Server port. Default: 3000
	port: Number(process.env.PORT) || env("PORT", 3000),

	// ─── Database ────────────────────────────────────────────
	// Dialect: "bun-sqlite" | "postgres" | "mysql" | "d1" | "sqlite"
	//   bun-sqlite: { filename: "data/app.db" }
	//   postgres:   { url: "postgres://user:pass@host:5432/db" }
	//   mysql:      { url: "mysql://user:pass@host:3306/db" }
	//   d1:         { binding: "DB" }  (Cloudflare Workers)
	//   sqlite:     { filename: "data/app.db" }
	db: {
{{DB}}
	},

	// ─── Router ──────────────────────────────────────────────
	// directory: Route files directory (default: "routes")
	// prefix:    URL prefix for all routes (default: "")
	router: { prefix: env("ROUTER_PREFIX", ""), directory: "routes" },

	// ─── Views ───────────────────────────────────────────────
	// directory: Template files directory (default: "views")
	view: { directory: "views" },

	// ─── App ─────────────────────────────────────────────────
	// key:   Encryption key (generate via `bun run bi key:generate`)
	// debug: Enable debug toolbar + SQL query logging
	app: { key: env("APP_KEY", ""), debug: env("DEBUG", false) as unknown as boolean }{{EDGE}}{{SERVICES}}

	// ─── Middleware ───────────────────────────────────────────
	// CORS, Logger, CSRF, Rate Limiter — all optional
	middleware: {
		cors: { origin: env("CORS_ORIGIN", "*"), credentials: true },
		logger: { enabled: env("DEBUG", false) as unknown as boolean, showQuery: true },
		csrf: { secret: env("APP_KEY", "") },
		throttle: { max: 100, window: 60000 },
	},
}
