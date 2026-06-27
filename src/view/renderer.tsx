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
): Promise<string> {
	// Try to load the component from views/ directory
	let Component = registry.get(name)

	if (!Component) {
		// Auto-load from views/
		const viewPath = join(process.cwd(), viewsDir, `${name}.tsx`)
		const viewPath2 = join(process.cwd(), viewsDir, name, 'index.tsx')

		const targetPath = existsSync(viewPath) ? viewPath : existsSync(viewPath2) ? viewPath2 : null
		if (targetPath) {
			const mod = await import(targetPath)
			Component = mod.default ?? mod[name]
			if (Component) {
				registry.set(name, Component)
			}
		}
	}

	if (!Component) {
		// Fallback: render props as JSON in HTML shell
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
