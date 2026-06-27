/**
 * Page — Inertia-style page response for server-rendered views.
 *
 * Combines a component name with props and renders either:
 * - Full HTML (first request, SEO-friendly)
 * - JSON page object (subsequent Inertia navigation)
 *
 * @example
 * ```ts
 * // pages/users.ts
 * export class Users extends Controller {
 *   async index() {
 *     const users = await this.db.query('SELECT * FROM users')
 *     return this.page('Users/Index', { users })
 *   }
 * }
 * ```
 */
export interface PageOptions {
	/** HTTP status code. Default: 200 */
	status?: number

	/** Page title (injected into HTML shell). */
	title?: string

	/** Shared props merged with component props. */
	shared?: Record<string, any>

	/** Layout to wrap the page. */
	layout?: string | false

	/** Flash data (shown once then cleared). */
	flash?: Record<string, any>

	/** Asset version for cache busting. */
	version?: string
}

/**
 * Page response — returned from a controller to render a full page.
 */
export class PageResponse {
	public readonly component: string
	public readonly props: Record<string, any>
	public readonly options: PageOptions

	constructor(component: string, props: Record<string, any> = {}, options: PageOptions = {}) {
		this.component = component
		this.props = props
		this.options = options
	}

	/** Get the page object as JSON (for Inertia protocol). */
	toInertiaJson(sharedProps: Record<string, any> = {}): string {
		return JSON.stringify({
			component: this.component,
			props: { ...sharedProps, ...this.props },
			url: '', // set by the router
			version: this.options.version ?? null,
			flash: this.options.flash ?? null,
		})
	}

	/** Render full HTML shell with embedded page data. */
	toHtml(sharedProps: Record<string, any> = {}, url = '/'): string {
		const pageJson = JSON.stringify({
			component: this.component,
			props: { ...sharedProps, ...this.props },
			url,
			version: this.options.version ?? null,
			flash: this.options.flash ?? null,
		})

		const title = this.options.title ?? this.component
		const escapedPage = pageJson
			.replace(/&/g, '&amp;')
			.replace(/'/g, '&#39;')
			.replace(/"/g, '&quot;')

		return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <div id="app" data-page='${escapedPage}'></div>
</body>
</html>`
	}
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
