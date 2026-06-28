/**
 * View Renderer — Simple server-side React rendering for Bunigniter.
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
import { existsSync, readFileSync } from "node:fs"
import { extname, join } from "node:path"
import React from "react"
import { renderToString } from "react-dom/server"

/** Registry of view components. */
const registry = new Map<string, any>()

/** MDX modules cache. */
const _mdxCache = new Map<string, any>()

/** Views directory. */
let viewsDir = "views"

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
	options: { title?: string; scripts?: string[] } = {},
	viewBase?: string,
): Promise<string | Response> {
	// Try to load the component from views/ directory
	let Component = registry.get(name)

	if (!Component) {
		const base = viewBase ?? join(process.cwd(), viewsDir)
		const candidates = [
			join(base, `${name}.tsx`),
			join(base, `${name}.mdx`),
			join(base, `${name}.md`),
			join(base, `${name}.html`),
			join(base, name, "index.tsx"),
		]

		let targetPath: string | null = null
		for (const p of candidates) {
			if (existsSync(p)) {
				targetPath = p
				break
			}
		}

		if (targetPath) {
			const ext = extname(targetPath)
			if (ext === ".html") {
				// HTML templates use Rendu engine (PHP-like <?= ?> syntax)
				return renderHTML(targetPath, props)
			} else if (ext === ".mdx" || ext === ".md") {
				// MDX with Rendu support (<?= ?>, {{ }}) + markdown rendering
				return renderMDXView(targetPath, props)
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
		const scripts = (options.scripts ?? []).map((s) => `<script src="${s}"></script>`).join("\n")
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
function renderFallback(
	name: string,
	props: Record<string, any>,
	options: { title?: string; scripts?: string[] },
): string {
	const title = options.title ?? name
	const serialized = JSON.stringify({ component: name, props })
	const scripts = (options.scripts ?? []).map((s) => `<script src="${s}"></script>`).join("\n")

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
function _compileHTML(filePath: string, _props: Record<string, any>): any {
	const _source = readFileSync(filePath, "utf-8")

	// Build a component that renders the template at request time
	const HtmlComponent = () => {
		// Use React state/effect to render on mount, but for SSR we need sync
		// Actually, return a placeholder that gets stream-rendered
		throw new Error("Use renderHTML() instead of React for .html templates")
	}

	return HtmlComponent
}

/**
 * Render an HTML template using Rendu engine.
 * Handles PHP-style <?= ?>, control flow <?js ?>, and {{ }} mustache syntax.
 * Returns a Promise<Response> with rendered HTML.
 */
export async function renderHTML(filePath: string, props: Record<string, any> = {}): Promise<Response> {
	const source = readFileSync(filePath, "utf-8")

	// Compile template using Rendu
	const { compileTemplate } = await import("rendu")

	/** Include a sub-template (partial) file. */
	const includeSub = async (name: string): Promise<string> => {
		const dir = filePath.substring(0, filePath.lastIndexOf("/"))
		let subPath = join(dir, name)
		if (!existsSync(subPath)) {
			const ext = name.endsWith(".html") ? "" : ".html"
			subPath = join(dir, name + ext)
		}
		if (!existsSync(subPath)) return `<!-- missing partial: ${name} -->`

		const subSource = readFileSync(subPath, "utf-8")
		const subFn = compileTemplate(subSource)
		const subStream = await subFn(ctx)
		const reader = subStream.getReader()
		let result = ""
		while (true) {
			const { done, value } = await reader.read()
			if (done) break
			result += new TextDecoder().decode(value)
		}
		return result
	}

	const fn = compileTemplate(source)
	const ctx = {
		htmlspecialchars: (s: unknown) =>
			String(s ?? "")
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;"),
		include: async (name: string) => await includeSub(name),
		...props,
	}

	// Execute with props + rendu context
	const stream = await fn(ctx)

	// Collect stream into string
	const reader = stream.getReader()
	const chunks: Uint8Array[] = []
	while (true) {
		const { done, value } = await reader.read()
		if (done) break
		chunks.push(value)
	}

	let html = new TextDecoder().decode(concatUint8Arrays(chunks))

	// Auto-layout: wrap with _layout.html from same directory
	const layoutPath = join(filePath.substring(0, filePath.lastIndexOf("/")), "_layout.html")
	if (existsSync(layoutPath)) {
		const layoutSource = readFileSync(layoutPath, "utf-8")
		const layoutFn = compileTemplate(layoutSource)
		const layoutStream = await layoutFn({
			htmlspecialchars: (s: unknown) =>
				String(s ?? "")
					.replace(/&/g, "&amp;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;")
					.replace(/"/g, "&quot;"),
			slot: html,
			...props,
		})
		const layoutReader = layoutStream.getReader()
		const layoutChunks: Uint8Array[] = []
		while (true) {
			const { done, value } = await layoutReader.read()
			if (done) break
			layoutChunks.push(value)
		}
		html = new TextDecoder().decode(concatUint8Arrays(layoutChunks))
	}

	return new Response(html, {
		headers: { "content-type": "text/html; charset=utf-8" },
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
 * Render an MDX view file to HTML using Rendu for interpolation
 * and Bun.markdown.react() for markdown rendering.
 *
 * Supports:
 *   <?= expr ?>   — PHP-style output (Rendu)
 *   {{ expr }}    — Jinja-style escaped output (Rendu)
 *   {{{ expr }}}  — Jinja-style raw output (Rendu)
 *   <?js code ?>  — JavaScript control flow (Rendu)
 *
 * Then standard markdown via Bun.markdown.react().
 */
export async function renderMDXView(filePath: string, props: Record<string, any> = {}): Promise<Response> {
	const source = readFileSync(filePath, "utf-8")
	const content = source.replace(/^---[\s\S]*?---\n?/, "")

	// Step 1: Pre-render partials (_*.html) and replace include() calls
	// with their rendered HTML (added AFTER markdown rendering to avoid conflicts)
	const renderedPartials: string[] = []
	const processed = content
		.replace(/<\?=\s*await\s+include\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\?>/g, (_match: string, partialName: string) => {
			const placeholder = `<!--INCLUDE_PLACEHOLDER_${renderedPartials.length}-->`
			renderedPartials.push(partialName)
			return placeholder
		})
		.replace(/`<\?=(.+?)`/g, "`&lt;?=$1`")
		.replace(/`<\?js(.+?)\?>`/g, "`&lt;?js$1?&gt;`")

	// Step 2: Render through Rendu for <?= ?> and {{ }} interpolation
	const { compileTemplate } = await import("rendu")
	const fn = compileTemplate(processed)
	const ctx = {
		htmlspecialchars: (s: unknown) =>
			String(s ?? "")
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;"),
		...props,
	}
	const stream = await fn(ctx)
	const reader = stream.getReader()
	let interpolated = ""
	while (true) {
		const { done, value } = await reader.read()
		if (done) break
		interpolated += new TextDecoder().decode(value)
	}

	// Step 3: Split at placeholders, render markdown parts, insert rendered partials
	const parts = interpolated.split(/<!--INCLUDE_PLACEHOLDER_\d+-->/)
	let finalHtml = ""

	const mdOverrides = {
		h1: (p: any) => React.createElement("h1", { id: p.id, style: { color: "#e94560" } }, p.children),
		a: (p: any) => React.createElement("a", { href: p.href, style: { color: "#70a1ff" } }, p.children),
		pre: (p: any) =>
			React.createElement(
				"pre",
				{ style: { background: "#1a1a3e", padding: 16, borderRadius: 8, overflow: "auto" } },
				p.children,
			),
		code: (p: any) =>
			React.createElement(
				"code",
				{ style: { background: "#333", padding: "2px 6px", borderRadius: 3, fontSize: "0.9em" } },
				p.children,
			),
	}
	const mdOptions = { tables: true, strikethrough: true, tasklists: true, autolinks: true, headings: { ids: true } }

	for (let i = 0; i < parts.length; i++) {
		const mdPart = parts[i].trim()
		if (mdPart) {
			const elements = Bun.markdown.react(mdPart, mdOverrides, mdOptions)
			finalHtml += renderToString(elements)
		}

		// Insert rendered partial after each markdown part (except the last)
		if (i < renderedPartials.length) {
			const partialName = renderedPartials[i]
			const dir = filePath.substring(0, filePath.lastIndexOf("/"))
			let subPath = join(dir, partialName)
			if (!existsSync(subPath)) subPath = join(dir, partialName + (partialName.endsWith(".html") ? "" : ".html"))

			if (existsSync(subPath)) {
				const subSource = readFileSync(subPath, "utf-8")
				const subFn = compileTemplate(subSource)
				const subStream = await subFn(ctx)
				const subReader = subStream.getReader()
				let subHtml = ""
				while (true) {
					const { done, value } = await subReader.read()
					if (done) break
					subHtml += new TextDecoder().decode(value)
				}
				finalHtml += subHtml
			}
		}
	}

	// Auto-layout: wrap with _layout.html from same directory
	const mdxLayoutPath = join(filePath.substring(0, filePath.lastIndexOf("/")), "_layout.html")
	if (existsSync(mdxLayoutPath)) {
		const layoutSource = readFileSync(mdxLayoutPath, "utf-8")
		const layoutFn = compileTemplate(layoutSource)
		const layoutStream = await layoutFn({
			htmlspecialchars: (s: unknown) =>
				String(s ?? "")
					.replace(/&/g, "&amp;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;")
					.replace(/"/g, "&quot;"),
			slot: finalHtml,
			...props,
		})
		const lr = layoutStream.getReader()
		const lc: Uint8Array[] = []
		while (true) {
			const { done, value } = await lr.read()
			if (done) break
			lc.push(value)
		}
		finalHtml = new TextDecoder().decode(concatUint8Arrays(lc))
	}

	// Wrap in full HTML document
	return new Response(finalHtml, {
		headers: { "content-type": "text/html; charset=utf-8" },
	})
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
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;")
}
