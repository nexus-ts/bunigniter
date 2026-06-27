/**
 * View Renderer — Simple server-side React rendering for NexusTS.
 *
 * Controllers return `this.view('ComponentName', { props })` and the
 * framework SSR-renders the React component to HTML.
 *
 * @example
 * ```tsx
 * // views/TodoList.tsx (React component)
 * export default function TodoList({ todos, stats }: any) {
 *   return (
 *     <div>
 *       <h1>📋 Todo App</h1>
 *       <ul>{todos.map((t: any) => <li key={t.id}>{t.title}</li>)}</ul>
 *     </div>
 *   )
 * }
 * ```
 *
 * ```ts
 * // pages/todos.ts (Controller)
 * async index() {
 *   const todos = await this.db.query('SELECT * FROM todos')
 *   return this.view('TodoList', { todos: todos.rows })
 * }
 * ```
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, extname } from 'node:path'
import React from 'react'
import { renderToString } from 'react-dom/server'

/** Registry of view components. */
const registry = new Map<string, any>()

/** MDX modules cache. */
const mdxCache = new Map<string, any>()

/** Views directory. */
let viewsDir = 'views'

/**
 * Set the views directory.
 * Called automatically from config.
 */
export function setViewsDir(dir: string): void {
	viewsDir = dir
}

/**
 * Register a view component.
 * Called automatically when the view file is first loaded.
 */
export function registerView(name: string, component: any): void {
	registry.set(name, component)
}

/**
 * Render a view component to an HTML string.
 *
 * @param name - Component name (e.g. 'TodoList')
 * @param props - Props object passed to the component
 * @param options - Rendering options
 * @returns HTML string
 */
export async function renderView(
	name: string,
	props: Record<string, any> = {},
	options: { title?: string; scripts?: string[] } = {}
): Promise<string | Response> {
	// Try to load the component from views/ directory
	let Component = registry.get(name)

	if (!Component) {
		// Auto-load .tsx (React), .mdx (MDX), .html (plain HTML via rendu), or index
		const candidates = [
			join(process.cwd(), viewsDir, `${name}.tsx`),
			join(process.cwd(), viewsDir, `${name}.mdx`),
			join(process.cwd(), viewsDir, `${name}.md`),
			join(process.cwd(), viewsDir, `${name}.html`),
			join(process.cwd(), viewsDir, name, 'index.tsx'),
		]

		let targetPath: string | null = null
		for (const p of candidates) {
			if (existsSync(p)) { targetPath = p; break }
		}

		if (targetPath) {
			const ext = extname(targetPath)
			if (ext === '.html') {
				// HTML templates use Rendu engine (PHP-like <?= ?> syntax)
				return renderHTML(targetPath, props)
			} else if (ext === '.mdx' || ext === '.md') {
				Component = await compileMDX(targetPath, name, props)
			} else {
				const mod = await import(targetPath)
				Component = mod.default ?? mod[name]
			}
			if (Component) {
				registry.set(name, Component)
			}
		}
	}

	if (!Component) {
		return renderFallback(name, props, options)
	}

	try {
		const html = renderToString(React.createElement(Component, props))
		const title = options.title ?? name
		const serialized = JSON.stringify({ component: name, props })
		const scripts = (options.scripts ?? []).map(s => `<script src="${s}"></script>`).join('\n')
		return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <div id="app">${html}</div>
  <script id="__NEXUS_DATA__" type="application/json">${escapeHtml(serialized)}</script>
  ${scripts}
</body>
</html>`
	} catch (err: any) {
		return renderError(err, name, props)
	}
}

/** Fallback: render data-page shell (same as before). */
function renderFallback(name: string, props: Record<string, any>, options: { title?: string; scripts?: string[] }): string {
	const title = options.title ?? name
	const serialized = JSON.stringify({ component: name, props })
	const scripts = (options.scripts ?? []).map(s => `<script src="${s}"></script>`).join('\n')

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <div id="app" data-page='${escapeHtml(serialized)}'></div>
  ${scripts}
</body>
</html>`
}

/**
 * Compile a plain HTML file using Rendu (PHP-like template engine).
 * Supports <?= expr ?>, <?js code ?>, {{ expr }}, {{{ expr }}} syntax.
 */
function compileHTML(filePath: string, props: Record<string, any>): any {
	const source = readFileSync(filePath, 'utf-8')

	// Build a component that renders the template at request time
	const HtmlComponent = () => {
		// Use React state/effect to render on mount, but for SSR we need sync
		// Actually, return a placeholder that gets stream-rendered
		throw new Error('Use renderHTML() instead of React for .html templates')
	}

	return HtmlComponent
}

/**
 * Render an HTML template using Rendu engine.
 * Handles PHP-style <?= ?>, control flow <?js ?>, and {{ }} mustache syntax.
 * Returns a Promise<Response> with rendered HTML.
 */
export async function renderHTML(filePath: string, props: Record<string, any> = {}): Promise<Response> {
	const source = readFileSync(filePath, 'utf-8')

	// Compile template using Rendu
	const { compileTemplate } = await import('rendu')
	const fn = compileTemplate(source)

	// Execute with props
	const stream = await fn(props)

	// Collect stream into string
	const reader = stream.getReader()
	const chunks: Uint8Array[] = []
	while (true) {
		const { done, value } = await reader.read()
		if (done) break
		chunks.push(value)
	}

	const html = new TextDecoder().decode(concatUint8Arrays(chunks))

	return new Response(html, {
		headers: { 'content-type': 'text/html; charset=utf-8' }
	})
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
	const total = arrays.reduce((s, a) => s + a.length, 0)
	const result = new Uint8Array(total)
	let offset = 0
	for (const a of arrays) {
		result.set(a, offset)
		offset += a.length
	}
	return result
}

/**
 * Compile an MDX file into a React component using Bun's built-in
 * markdown parser (Bun.markdown.react()). No external packages needed.
 */
async function compileMDX(filePath: string, name: string, props: Record<string, any>): Promise<any> {
	const cacheKey = filePath
	if (mdxCache.has(cacheKey)) return mdxCache.get(cacheKey)

	try {
		const source = readFileSync(filePath, 'utf-8')

		// Extract frontmatter (optional)
		const content = source.replace(/^---[\s\S]*?---\n?/, '')

		// Use Bun's built-in Markdown → React parser
		const MdxContent = (overrideProps: any) => {
			const merged = { ...props, ...overrideProps }

			// Jinja-style template interpolation: {{ key }} → prop value
			const hasTemplate = /\{\{/.test(content)
			const rendered = content.replace(/\{\{\s*(\w+(?:\.\w+)*)\s*\}\}/g, (match, keyPath) => {
				const value = keyPath.split('.').reduce((obj: any, key: string) => obj?.[key], merged)
				return value !== undefined ? String(value) : '**MISSING: ' + keyPath + '**'
			})
			if (hasTemplate) console.log('[mdx] Interpolated template vars')

			return Bun.markdown.react(rendered, {
				h1: ({ children, id }: any) =>
					React.createElement('h1', { id, style: { color: '#e94560' } }, children),
				a: ({ href, children }: any) =>
					React.createElement('a', { href, style: { color: '#70a1ff' } }, children),
				pre: ({ children }: any) =>
					React.createElement('pre', { style: { background: '#1a1a3e', padding: 16, borderRadius: 8, overflow: 'auto' } }, children),
				code: ({ children }: any) =>
					React.createElement('code', { style: { background: '#333', padding: '2px 6px', borderRadius: 3, fontSize: '0.9em' } }, children),
			}, {
				tables: true,
				strikethrough: true,
				tasklists: true,
				autolinks: true,
				headings: { ids: true },
			})
		}

		mdxCache.set(cacheKey, MdxContent)
		return MdxContent
	} catch (err: any) {
		console.error('[view] MDX error:', err.message)
		return null
	}
}



/** Error page. */
function renderError(err: Error, name: string, props: Record<string, any>): string {
	return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>View Error</title></head>
<body>
  <h1>Failed to render view: ${escapeHtml(name)}</h1>
  <pre style="color:red">${escapeHtml(err.message)}</pre>
  <pre>${escapeHtml(JSON.stringify(props, null, 2))}</pre>
</body>
</html>`
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
