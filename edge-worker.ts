/**
 * Cloudflare Workers entry point.
 *
 * Usage:
 *   1. `bun run nx build:edge` — generates edge-app.ts
 *   2. `wrangler deploy` — deploys to Cloudflare Workers
 *
 * Or for local dev:
 *   `bun run nx edge:dev` — runs edge app on port 3001
 */
import edgeApp from './edge-app'

export default {
	fetch: edgeApp.fetch,
}
