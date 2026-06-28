/**
 * OpenAPI — auto-generate OpenAPI 3.1 spec from registered routes.
 *
 * Users can customize route documentation:
 *
 * ```ts
 * // In any controller file (top-level)
 * OpenAPIRegistry.add('/posts', 'GET', {
 *   summary: 'List all posts',
 *   description: 'Returns paginated list of blog posts',
 *   tags: ['Blog'],
 * })
 * ```
 */
import type { Elysia } from 'elysia'

export interface OpenAPIConfig {
	title?: string
	version?: string
	description?: string
	specPath?: string
	docsPath?: string
}

interface RouteDoc {
	summary?: string
	description?: string
	tags?: string[]
	parameters?: any[]
	requestBody?: any
	responses?: Record<string, any>
	deprecated?: boolean
}

const defaults: OpenAPIConfig = {
	title: 'Bunigniter API',
	version: '1.0.0',
	specPath: '/openapi.json',
	docsPath: '/docs',
}

// ─── User-facing registry ──────────────────────────────────────

const routeDocs = new Map<string, Map<string, RouteDoc>>()

/**
 * Register OpenAPI documentation for a route.
 * Call this at the top level of any route file.
 *
 * @example
 * ```ts
 * // routes/posts.ts
 * import { OpenAPIRegistry } from 'bunigniter/helpers/openapi'
 *
 * OpenAPIRegistry.add('/posts', 'GET', {
 *   summary: 'List all posts',
 *   tags: ['Blog'],
 * })
 * ```
 */
export const OpenAPIRegistry = {
	add(path: string, method: string, doc: RouteDoc): void {
		const m = method.toUpperCase()
		if (!routeDocs.has(path)) routeDocs.set(path, new Map())
		routeDocs.get(path)!.set(m, doc)
	},
}

// ─── Spec generation ───────────────────────────────────────────

export function openapi(app: any, config?: OpenAPIConfig): void {
	const cfg = { ...defaults, ...config }

	app.get(cfg.specPath, () => {
		const spec = generateSpec(app, cfg)
		return new Response(JSON.stringify(spec, null, 2), {
			headers: { 'content-type': 'application/json' },
		})
	})

	app.get(cfg.docsPath, () => {
		const html = `<!DOCTYPE html>
<html><head>
  <title>${cfg.title}</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head><body>
  <script id="api-reference" data-url="${cfg.specPath}"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body></html>`
		return new Response(html, {
			headers: { 'content-type': 'text/html; charset=utf-8' },
		})
	})
}

function generateSpec(app: any, cfg: OpenAPIConfig): Record<string, any> {
	const routes: Array<{ method: string; path: string }> = app.routes ?? []
	const tags = new Set<string>()
	const paths: Record<string, any> = {}

	for (const route of routes) {
		const method = route.method.toLowerCase()
		const path = route.path
		const userDoc = routeDocs.get(route.path)?.get(route.method)

		if (!paths[path]) paths[path] = {}

		const entry = userDoc ?? {}
		if (entry.tags) entry.tags.forEach((t: string) => tags.add(t))

		paths[path][method] = {
			summary: entry.summary ?? `${route.method} ${path}`,
			description: entry.description ?? '',
			tags: entry.tags,
			deprecated: entry.deprecated,
			parameters: entry.parameters ?? extractParams(path),
			...(entry.requestBody ? { requestBody: entry.requestBody } : {}),
			responses: entry.responses ?? { '200': { description: 'Successful response' } },
		}
	}

	return {
		openapi: '3.1.0',
		info: { title: cfg.title, version: cfg.version, description: cfg.description ?? '' },
		tags: [...tags].map(name => ({ name })),
		paths,
	}
}

function extractParams(path: string): any[] {
	const params: any[] = []
	const matches = path.match(/:(\w+)/g)
	if (matches) {
		for (const m of matches) {
			params.push({ name: m.slice(1), in: 'path', required: true, schema: { type: 'string' } })
		}
	}
	return params
}
