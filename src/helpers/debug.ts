/**
 * Debug Toolbar — CodeIgniter-style profiler.
 *
 * Collects SQL queries, timing, session data and injects a
 * collapsible toolbar into HTML responses.
 *
 * Enable: `?debug=1` or `DEBUG=true` env var.
 *
 * To add SQL profiling, wrap your DB queries:
 * ```ts
 * import { debugQuery } from './debug'
 * const start = performance.now()
 * // ... execute query ...
 * debugQuery(ctx, 'SELECT * FROM users', duration, rowCount)
 * ```
 */

// ─── Types ─────────────────────────────────────────────────────

export interface DebugQuery {
	id: number
	sql: string
	duration: number
	rows: number
	params?: unknown[]
	time: string
}

export interface DebugData {
	method: string
	path: string
	status: number
	duration: number
	queries: DebugQuery[]
	session: Record<string, any>
	memory: string
	headers: Record<string, string>
	timestamp: string
}

// ─── Store ─────────────────────────────────────────────────────

const store = new WeakMap<any, DebugData>()

/** Store a debug data object for the current request context. */
export function getStore(ctx: any): DebugData {
	let d = store.get(ctx)
	if (!d) {
		d = {
			method: ctx.request?.method ?? 'GET',
			path: new URL(ctx.request?.url ?? 'http://localhost').pathname,
			status: 200,
			duration: 0,
			queries: [],
			session: {},
			memory: '0 MB',
			headers: {},
			timestamp: new Date().toLocaleString(),
		}
		store.set(ctx, d)
	}
	return d
}

/** Log a database query for profiling. */
export function debugQuery(ctx: any, sql: string, duration: number, rows: number, params?: unknown[]): void {
	const data = getStore(ctx)
	data.queries.push({
		id: data.queries.length + 1,
		sql,
		duration: Math.round(duration * 100) / 100,
		rows,
		params,
		time: new Date().toLocaleTimeString(),
	})
}

// ─── Toolbar HTML (rendered via Rendu template) ──────────────

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Render the debug toolbar using the Rendu template at views/_debug.html.
 * Falls back to inline generation if template not found.
 */
export async function generateToolbar(data: DebugData): Promise<string> {
	// Try to use the Rendu template
	const templatePath = join(process.cwd(), 'views', '_debug.html')
	if (existsSync(templatePath)) {
		try {
			const { compileTemplate } = await import('rendu')
			const source = readFileSync(templatePath, 'utf-8')
			const fn = compileTemplate(source)

			const maxDur = Math.max(...data.queries.map(q => q.duration), 1)
			const slowCount = data.queries.filter(q => q.duration > 100).length
			const totalTime = data.queries.reduce((s, q) => s + q.duration, 0)

			const stream = await fn({
				htmlspecialchars: (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
				valEscaped: (v: any) => String(typeof v === 'object' ? JSON.stringify(v) : v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
				method: data.method,
				path: data.path,
				status: data.status,
				duration: data.duration,
				memory: data.memory,
				timestamp: data.timestamp,
				queries: data.queries.map(q => ({
					...q,
					barWidth: Math.max(3, (q.duration / maxDur) * 80),
					color: q.duration > 100 ? '#f94860' : '#7bed9f',
					pillClass: q.duration > 100 ? 'pill-slow' : 'pill-ok',
					sqlEscaped: String(q.sql ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
					paramsEscaped: q.params ? String(JSON.stringify(q.params)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '',
				})),
				session: data.session,
				sessionKeys: String(Object.keys(data.session).length),
				slowCount,
				totalTime: Math.round(totalTime * 100) / 100,
				runtime: typeof Bun !== 'undefined' ? 'Bun ' + Bun.version : 'Node.js',
			})
			const reader = stream.getReader()
			const chunks: Uint8Array[] = []
			while (true) { const { done, value } = await reader.read(); if (done) break; chunks.push(value) }
			return new TextDecoder().decode(concatUint8Arrays(chunks))
		} catch { /* fall through to inline */ }
	}

	// Inline fallback
	return renderInline(data)
}

function renderInline(data: DebugData): string {
	const slow = data.queries.filter(q => q.duration > 100)
	const warn = slow.length > 0 ? ' ⚠️' : ''
	const qtext = data.queries.length === 1 ? 'query' : 'queries'

	return `<!-- Debug -->
<div class="nexdb" id="__nexdb" style="all:initial;position:fixed;bottom:0;left:0;right:0;z-index:99999;font-family:system-ui,sans-serif;font-size:13px;color:#e0e0e0;background:#13131f;border-top:2px solid #e94560">
<div style="display:flex;align-items:center;gap:8px;padding:8px 16px;cursor:pointer" onclick="document.getElementById('__nexdb').classList.toggle('open')">
<span style="font-weight:700;color:#e94560">▣ NexusTS</span>
<span style="background:#e94560;color:#fff;padding:1px 7px;border-radius:3px;font-size:11px;font-weight:600">${data.method}</span>
<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#aaa;font-size:12px">${data.path}</span>
<span style="background:#2d2d5e;color:#fff;padding:1px 7px;border-radius:3px;font-size:11px"><b>${data.status}</b></span>
<span style="background:rgba(248,165,194,0.15);color:#f8a5c2;padding:1px 7px;border-radius:3px;font-size:11px">${data.duration}ms</span>
<span style="background:rgba(123,237,159,0.15);color:#7bed9f;padding:1px 7px;border-radius:3px;font-size:11px">📊 <b>${data.queries.length}</b> ${qtext}${warn}</span>
<span style="background:rgba(112,161,255,0.15);color:#70a1ff;padding:1px 7px;border-radius:3px;font-size:11px">💾 ${data.memory}</span>
</div></div>`
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
	const total = arrays.reduce((s, a) => s + a.length, 0)
	const result = new Uint8Array(total)
	let offset = 0
	for (const a of arrays) { result.set(a, offset); offset += a.length }
	return result
}
