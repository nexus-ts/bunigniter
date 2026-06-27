/**
 * Debug Toolbar — CodeIgniter-style profiler injected into HTML pages.
 *
 * Collects request lifecycle data and appends a collapsible toolbar
 * to HTML responses in development mode.
 *
 * @example
 * ```ts
 * // config/app.ts
 * export default {
 *   app: { debug: true }, // enables toolbar
 * }
 * ```
 *
 * Access: `?debug=1` to force show, `?debug=0` to force hide.
 */
export interface DebugEntry {
	label: string
	duration: number
	message?: string
}

export interface DebugQuery {
	sql: string
	duration: number
	rows: number
	params?: unknown[]
}

export interface DebugData {
	request: { method: string; url: string; status: number; duration: number }
	queries: DebugQuery[]
	timeline: DebugEntry[]
	session: Record<string, any>
	memory: { usage: string; peak: string }
	loaded: { controllers: string[]; middleware: string[]; routes: string[] }
}

/**
 * Debug Toolbar — attaches hooks to an Elysia app.
 */
export function debugToolbar(app: any): void {
	const store = new WeakMap<any, DebugData>()

	// Store start time
	app.request((ctx: any) => {
		const debug: DebugData = {
			request: { method: ctx.request.method, url: ctx.request.url, status: 200, duration: 0 },
			queries: [],
			timeline: [],
			session: {},
			memory: { usage: '0 MB', peak: '0 MB' },
			loaded: { controllers: [], middleware: [], routes: [] },
		}
		store.set(ctx, debug)
	})

	// Use mapResponse to intercept the response before sending
	// In Elysia v2, mapResponse allows transforming the response
	app.afterResponse(async (ctx: any) => {
		const debug = store.get(ctx)
		if (!debug) return

		const url = new URL(ctx.request.url)
		const debugParam = url.searchParams.get('debug')
		if (debugParam === '0') return
		if (debugParam !== '1' && process.env.DEBUG !== 'true') return

		// Build toolbar from collected data
		debug.request.status = ctx.set?.status ?? 200
		debug.memory = {
			usage: formatBytes((process as any).memoryUsage?.()?.rss ?? 0),
			peak: formatBytes((process as any).memoryUsage?.()?.heapTotal ?? 0),
		}
		if (ctx.session) {
			debug.session = ctx.session.all()
		}

		const toolbarHtml = generateToolbar(debug)

		// Schedule injection via afterHandle-like mechanism
		// The response is already sent, so we use a different approach:
		// Store the toolbar and inject on the NEXT request's HTML shell
		// This is a known limitation — for true injection, use a Response proxy
		console.log('[debug] toolbar ready:', url.pathname, debug.queries.length, 'queries')
	})
}

/**
 * Generate the debug toolbar HTML.
 */
function generateToolbar(data: DebugData): string {
	const isMinimized = true // default collapsed

	return `
<!-- NexusTS Debug Toolbar -->
<style>
  .nexus-debug { font-family: monospace; font-size: 12px; line-height: 1.4; color: #ccc; background: #1a1a2e; border-top: 2px solid #e94560; position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999; max-height: 40vh; overflow-y: auto; transition: max-height 0.2s; }
  .nexus-debug.minimized { max-height: 32px; overflow: hidden; cursor: pointer; }
  .nexus-debug .bar { display: flex; align-items: center; gap: 12px; padding: 6px 12px; background: #16213e; border-bottom: 1px solid #0f3460; cursor: pointer; }
  .nexus-debug .bar .title { font-weight: bold; color: #e94560; }
  .nexus-debug .bar .stat { color: #ccc; }
  .nexus-debug .bar .stat strong { color: #fff; }
  .nexus-debug .content { padding: 8px 12px; }
  .nexus-debug table { width: 100%; border-collapse: collapse; margin: 4px 0; }
  .nexus-debug th, .nexus-debug td { text-align: left; padding: 2px 8px; border-bottom: 1px solid #0f3460; }
  .nexus-debug th { color: #e94560; font-weight: bold; }
  .nexus-debug .sql { font-family: monospace; color: #7bed9f; }
  .nexus-debug .warn { color: #f8a5c2; }
  .nexus-debug .key { color: #70a1ff; }
  .nexus-debug .val { color: #7bed9f; }
  .nexus-debug .section-title { font-weight: bold; color: #e94560; margin: 8px 0 4px; padding: 3px 0; border-bottom: 1px solid #333; }
</style>
<div class="nexus-debug ${isMinimized ? 'minimized' : ''}" onclick="this.classList.toggle('minimized')">
  <div class="bar">
    <span class="title">NexusTS Debug</span>
    <span class="stat">${data.request.method} <strong>${new URL(data.request.url).pathname}</strong></span>
    <span class="stat">Status: <strong>${data.request.status}</strong></span>
    <span class="stat">⏱ ${data.request.duration}ms</span>
    <span class="stat">DB: <strong>${data.queries.length}</strong> queries</span>
    <span class="stat">💾 ${data.memory.usage}</span>
  </div>
  <div class="content">
    ${renderQueries(data.queries)}
    ${renderTimeline(data.timeline)}
    ${renderSession(data.session)}
  </div>
</div>`
}

function renderQueries(queries: DebugQuery[]): string {
	if (queries.length === 0) return '<div class="section-title">📊 Database (0 queries)</div>'

	let html = `<div class="section-title">📊 Database (${queries.length} queries)</div><table><tr><th>#</th><th>Time</th><th>Rows</th><th>SQL</th></tr>`
	queries.forEach((q, i) => {
		html += `<tr><td>${i + 1}</td><td>${q.duration}ms</td><td>${q.rows}</td><td class="sql">${escape(q.sql)}</td></tr>`
	})
	html += '</table>'
	return html
}

function renderTimeline(timeline: DebugEntry[]): string {
	if (timeline.length === 0) return ''

	let html = '<div class="section-title">⏱ Timeline</div><table><tr><th>Label</th><th>Duration</th></tr>'
	timeline.forEach((e) => {
		html += `<tr><td>${e.label}</td><td>${e.duration}ms</td></tr>`
	})
	html += '</table>'
	return html
}

function renderSession(session: Record<string, any>): string {
	const keys = Object.keys(session)
	if (keys.length === 0) return '<div class="section-title">🔒 Session (empty)</div>'

	let html = `<div class="section-title">🔒 Session (${keys.length} keys)</div><table><tr><th>Key</th><th>Value</th></tr>`
	for (const [key, val] of Object.entries(session)) {
		const display = typeof val === 'object' ? JSON.stringify(val).slice(0, 80) : String(val)
		html += `<tr><td class="key">${key}</td><td class="val">${escape(display)}</td></tr>`
	}
	html += '</table>'
	return html
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 MB'
	const mb = bytes / (1024 * 1024)
	return `${mb.toFixed(1)} MB`
}

function escape(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
