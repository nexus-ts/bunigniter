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
): Promise<string> {
	// Try to load the component from views/ directory
	let Component = registry.get(name)

	if (!Component) {
		// Auto-load .tsx (React), .mdx (MDX), or index.tsx from subdir
		const candidates = [
			join(process.cwd(), viewsDir, `${name}.tsx`),
			join(process.cwd(), viewsDir, `${name}.mdx`),
			join(process.cwd(), viewsDir, `${name}.md`),
			join(process.cwd(), viewsDir, name, 'index.tsx'),
			join(process.cwd(), viewsDir, name, 'page.mdx'),
		]

		let targetPath: string | null = null
		for (const p of candidates) {
			if (existsSync(p)) { targetPath = p; break }
		}

		if (targetPath) {
			const ext = extname(targetPath)
			if (ext === '.mdx' || ext === '.md') {
				// Compile MDX at runtime
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

/**
 * Compile an MDX file at runtime into a React component.
 * Writes compiled JS to a temp file, imports it, returns the default export.
 */
async function compileMDX(filePath: string, name: string, props: Record<string, any>): Promise<any> {
	const cacheKey = filePath
	if (mdxCache.has(cacheKey)) return mdxCache.get(cacheKey)

	try {
		const source = readFileSync(filePath, 'utf-8')

		// Compile MDX → JSX function using @mdx-js/mdx
		const { compile } = await import('@mdx-js/mdx')
		const compiled = await compile(source, {
			development: false,
			jsx: true,
			jsxImportSource: 'react',
		})

		const code = String(compiled)

		// Write to a temp .jsx file and import it
		const { writeFileSync, mkdirSync } = await import('node:fs')
		const tmpDir = join(process.cwd(), '.nexus', 'mdx-cache')
		const tmpFile = join(tmpDir, name.replace(/[^a-zA-Z0-9_]/g, '_') + '.jsx')
		mkdirSync(tmpDir, { recursive: true })

		// Add the jsx import so the compiled MDX works standalone
		const wrapped = `import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
${code}`
		writeFileSync(tmpFile, wrapped, 'utf-8')

		// Import the compiled module (add cache buster)
		const cacheBuster = Date.now()
		const mod = await import(tmpFile + '?v=' + cacheBuster)
		const MdxContent = mod.default

		if (!MdxContent) {
			console.error('[view] MDX compiled but no default export found')
			return null
		}

		mdxCache.set(cacheKey, MdxContent)
		return MdxContent
	} catch (err: any) {
		console.error('[view] MDX compile error:', err.message)
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
