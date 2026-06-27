/**
 * OpenAPI — auto-generate OpenAPI 3.1 spec from registered routes.
 *
 * @example
 * ```ts
 * // src/index.ts
 * import { openapi } from './helpers/openapi'
 * openapi(app, { title: 'My API', version: '1.0.0' })
 * // GET /openapi.json → OpenAPI spec
 * // GET /docs → Scalar UI
 * ```
 */
import type { Elysia } from 'elysia'

export interface OpenAPIConfig {
	title?: string
	version?: string
	description?: string
	/** Path to serve the spec. Default: '/openapi.json' */
	specPath?: string
	/** Path to serve the docs UI. Default: '/docs' */
	docsPath?: string
}

/** Default config. */
const defaults: OpenAPIConfig = {
	title: 'NexusTS API',
	version: '1.0.0',
	description: '',
	specPath: '/openapi.json',
	docsPath: '/docs',
}

/**
 * Mount OpenAPI spec + Scalar UI on the app.
 */
export function openapi(app: any, config?: OpenAPIConfig): void {
	const cfg = { ...defaults, ...config }

	// Generate spec endpoint
	app.get(cfg.specPath, (ctx: any) => {
		const spec = generateSpec(app, cfg)
		return new Response(JSON.stringify(spec, null, 2), {
			headers: { 'content-type': 'application/json' },
		})
	})

	// Scalar UI
	app.get(cfg.docsPath, () => {
		const html = `<!DOCTYPE html>
<html>
<head>
  <title>${cfg.title}</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <script id="api-reference" data-url="${cfg.specPath}"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`
		return new Response(html, {
			headers: { 'content-type': 'text/html; charset=utf-8' },
		})
	})
}

/** Generate an OpenAPI 3.1 spec object from the app's routes. */
function generateSpec(app: any, cfg: OpenAPIConfig): Record<string, any> {
	const routes: Array<{ method: string; path: string }> = app.routes ?? []

	const paths: Record<string, any> = {}

	for (const route of routes) {
		const method = route.method.toLowerCase()
		const path = route.path

		if (!paths[path]) paths[path] = {}

		paths[path][method] = {
			summary: `${route.method} ${path}`,
			operationId: `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
			parameters: extractParams(path),
			responses: {
				'200': { description: 'Successful response' },
			},
		}
	}

	return {
		openapi: '3.1.0',
		info: {
			title: cfg.title,
			version: cfg.version,
			description: cfg.description,
		},
		paths,
	}
}

/** Extract path parameters from a route path. */
function extractParams(path: string): any[] {
	const params: any[] = []
	const matches = path.match(/:(\w+)/g)
	if (matches) {
		for (const m of matches) {
			params.push({
				name: m.slice(1),
				in: 'path',
				required: true,
				schema: { type: 'string' },
			})
		}
	}
	return params
}
