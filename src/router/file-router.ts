/**
 * File Router — CodeIgniter-style file-path routing.
 *
 * Maps file paths to URL routes automatically:
 * ```
 * pages/
 * ├── users.ts        → GET/POST /api/users
 * ├── users/
 * │   └── [id].ts     → GET /api/users/:id
 * ├── auth/
 * │   └── login.ts    → GET/POST /api/auth/login
 * └── index.ts        → GET /api
 * ```
 *
 * Convention:
 * - `pages/users.ts` → `/api/users`
 * - `pages/users/[id].ts` → `/api/users/:id`
 * - `pages/index.ts` → `/api/`
 * - Exported class extending `Controller` is auto-registered
 * - Method names map to HTTP verbs: `index`=GET, `show`=GET/:id, `create`=POST, `update`=PUT, `destroy`=DELETE
 */

import { readdirSync, statSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { Elysia, t } from 'elysia'
import type { Controller } from '../base/controller'
import type { DbClient } from '../db/drizzle'
import { Session } from '../helpers/session'

export interface FileRouterOptions {
	/** Directory containing page files. Default: `pages` */
	directory?: string

	/** URL prefix for all routes. Default: `/api` */
	prefix?: string

	/** Database instance to inject into controllers. */
	db?: DbClient

	/** Called when a controller is registered (for DI/decoration). */
	onRegister?: (controller: Controller) => void
}

interface LoaderExport {
	loader?: (ctx: any) => Promise<Record<string, any>>
	action?: ((ctx: any, args?: any) => Promise<void>) | { config?: any; fn?: any }
}

/** Render a page component to HTML (server-side). */
function renderPage(component: string, props: Record<string, any>): string {
	// Build props JSON to embed in HTML shell
	const propsJson = escapeHtml(JSON.stringify(props))
	return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(component)}</title></head><body><div id="app" data-page='${propsJson}'></div></body></html>`
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Default method-to-verb mapping (CodeIgniter-style). */
const METHOD_MAP: Record<string, string> = Object.assign(Object.create(null), {
	index: 'GET',
	show: 'GET',
	create: 'POST',
	store: 'POST',
	update: 'PUT',
	destroy: 'DELETE',
	edit: 'GET',
})

/** Methods that need a param ID. */
const ID_METHODS = new Set(['show', 'update', 'destroy', 'edit'])

/**
 * Scan a directory and auto-register routes.
 *
 * @example
 * ```ts
 * // pages/users.ts — handles GET /api/users, POST /api/users
 * export class Users extends Controller {
 *   async index() { return this.json(await this.db.query('SELECT * FROM users')) }
 *   async show(id: number) { return this.json(await this.db.query('SELECT * FROM users WHERE id = ?', [id])) }
 *   async create() { const body = await this.body; ... }
 * }
 * ```
 */
export async function registerFileRoutes(app: Elysia, options: FileRouterOptions = {}): Promise<void> {
	const dir = options.directory ?? 'pages'
	const prefix = options.prefix ?? '/api'

	// Ensure directory exists
	try { statSync(dir) } catch {
		console.warn(`[router] pages directory not found: ${dir}`)
		return
	}

	// First pass: register .server.ts loader/action routes
	const serverFiles = scanDir(dir, '.server.ts')
	for (const file of serverFiles) {
		const fullPath = join(dir, file)
		const serverMod = await import(/* @vite-ignore */ join(process.cwd(), fullPath)) as LoaderExport
		const componentName = file.replace(/\.server\.ts$/, '')
		const urlPath = filePathToUrl(componentName + '.ts', prefix)

		if (serverMod.loader) {
			const handler = async (_ctx: any) => {
				const props = await (serverMod.loader as Function)(_ctx)
				// Serve as HTML shell (SSR placeholder) + JSON props
				return new Response(renderPage(componentName, props), {
					headers: { 'content-type': 'text/html; charset=utf-8' }
				})
			}
			registerRoute(app, 'GET', urlPath, handler, null as any, options)
		}

		if (serverMod.action) {
			const action = serverMod.action as any
			const handler = async (_ctx: any) => {
				let body
				try { body = await _ctx.request.json() } catch { body = {} }
				if (action.fn) {
					await action.fn(_ctx, { body })
				} else {
					await action(_ctx, { body })
				}
				return new Response(null, { status: 204 })
			}
			registerRoute(app, 'POST', urlPath, handler, null as any, options)
		}
	}

	// Second pass: register Controller routes
	const files = scanDir(dir, '.ts')

	for (const file of files) {
		if (file.endsWith('.server.ts')) continue

		const fullPath = join(dir, file)
		const mod = await import(/* @vite-ignore */ join(process.cwd(), fullPath))

		// Find the Controller subclass
		const ControllerClass = findController(mod)
		if (!ControllerClass) continue

		const controller = new ControllerClass() as Controller

		// Inject db
		if (options.db) {
			Object.defineProperty(controller, 'db', {
				value: options.db,
				writable: false,
			})
		}

		// Call onRegister hook
		options.onRegister?.(controller)

		// Convert file path to URL path
		const urlPath = filePathToUrl(file, prefix)

		// Register routes for each Controller method
		const isIndex = basename(file, '.ts') === 'index'

		for (const method of ['index', 'show', 'create', 'update', 'destroy']) {
			if (typeof (controller as any)[method] !== 'function') continue
			const verb = METHOD_MAP[method]
			const handler = (controller as any)[method].bind(controller)
			const methodPath = ID_METHODS.has(method)
				? (isIndex ? `${prefix}/:id` : `${urlPath}/:id`)
				: (isIndex ? prefix : urlPath)

			registerRoute(app, verb, methodPath, handler, controller, options)
		}
	}
}

// ─── Internal Helpers ──────────────────────────────────────────

function scanDir(dir: string, ext: string, baseDir = ''): string[] {
	const files: string[] = []
	const entries = readdirSync(dir, { withFileTypes: true })
	for (const entry of entries) {
		const relPath = baseDir ? `${baseDir}/${entry.name}` : entry.name
		if (entry.isDirectory()) {
			files.push(...scanDir(join(dir, entry.name), ext, relPath))
		} else if (entry.isFile() && entry.name.endsWith(ext) && !entry.name.startsWith('_')) {
			files.push(relPath)
		}
	}
	return files.sort()
}

function filePathToUrl(file: string, prefix: string): string {
	let url = file
		.replace(/\.ts$/, '')
		.replace(/\[\.\.\.\]/g, '*')
		.replace(/\[([^\]]+)\]/g, ':$1')
		.replace(/\/index$/, '')
		.replace(/\\/g, '/')

	return `${prefix}${url ? `/${url}` : ''}`
}

function findController(mod: Record<string, any>): (new () => Controller) | null {
	for (const key of Object.keys(mod)) {
		const val = mod[key]
		if (typeof val === 'function' && val.prototype && val.prototype.constructor) {
			// Check if it extends Controller
			let proto = val.prototype
			while (proto) {
				if (proto.constructor.name === 'Controller') return val
				proto = Object.getPrototypeOf(proto)
			}
		}
	}
	return null
}

function registerRoute(
	app: Elysia,
	verb: string,
	path: string,
	handler: (...args: any[]) => any,
	controller: Controller,
	options: FileRouterOptions
): void {
	const lowerVerb = verb.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch'

	// Determine if this route needs an ID param based on the path
	const needsId = path.endsWith('/:id')

	// Wrap handler: inject ctx + session + auth into controller
	const wrappedHandler = async (_ctx: any) => {
		let session: Session | null = null
		const cookieName = 'nexus_session'

		if (controller) {
			;(controller as any).ctx = _ctx

			// Create session from cookie
			session = new Session()
			const cookieHeader = _ctx.request?.headers?.get('cookie') ?? ''
			const match = cookieHeader.match(new RegExp(cookieName + '=([^;]+)'))
			session.load(match?.[1])
			;(controller as any).session = session

			// Create auth facade
			;(controller as any).auth = {
				user: () => session?.get('user'),
				login: (user: any) => { session?.set('user', user); session?.regenerate() },
				logout: () => { session?.delete('user'); session?.clear() },
				check: () => !!session?.get('user'),
			}
		}

		try {
			// Body is already parsed by Elysia — available at _ctx.body

			// Call handler — pass context for server routes, ID for Controller routes
			const id = _ctx.params?.id ? Number(_ctx.params.id) : undefined
			let result
			if (controller) {
				result = needsId ? await handler(id) : await handler()
			} else {
				result = await handler(_ctx)
			}

			// Save session cookie AFTER handler runs
			if (session) {
				const serialized = session.serialize()
				if (serialized) {
					if (!_ctx.set.headers) _ctx.set.headers = {}
					_ctx.set.headers['Set-Cookie'] = 
						`${cookieName}=${serialized.value}; Max-Age=${serialized.maxAge}; Path=/; HttpOnly; SameSite=Lax`
				}
			}

			if (result instanceof Response) return result
			if (result !== undefined && result !== null) {
				const status = (result as any)._status ?? 200
				return new Response(JSON.stringify(result), {
					status,
					headers: { 'content-type': 'application/json' }
				})
			}
			return new Response(null, { status: 204 })
		} catch (err) {
			console.error(`[ERROR] ${verb} ${path}:`, (err as Error).message)
			return new Response(JSON.stringify({ error: (err as Error).message }), {
				status: 500,
				headers: { 'content-type': 'application/json' }
			})
		}
	}

	// Elysia v2.0: .get(path, handler) — schema precedes handler in v2
	;(app as any)[lowerVerb](path, wrappedHandler)
}
