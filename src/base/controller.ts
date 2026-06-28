/**
 * Controller — CodeIgniter-style base class.
 *
 * Extend this to get `this.db`, `this.request`, `this.json()`, `this.view()`, `this.redirect()`.
 *
 * @example
 * ```ts
 * // pages/users.ts
 * export class Users extends Controller {
 *   async index() {
 *     const users = await this.db.query('SELECT * FROM users')
 *     return this.json(users)
 *   }
 * }
 * ```
 */
import type { Context } from "elysia";
import type { DbClient } from "../db/drizzle";
import {
	validate,
	validateStringRules,
	validateZod,
	type ValidationResult,
	type ValidationErrors,
	type rules,
} from "../helpers/validator";
import type { z } from "zod";
import type { Session } from "../helpers/session";
import type { Cache } from "../helpers/cache";
import type { Queue } from "../helpers/queue";
import type { Upload } from "../helpers/upload";
import type { Mail } from "../helpers/mail";
import { PageResponse, type PageOptions } from "../view/page";
import { ViewResponse } from "../view/view-response";
import { type HttpClient, createHttp } from "../helpers/http";
import { Image } from "../helpers/image";
import {
	paginate as paginateFn,
	addPaginationToDb,
	type PaginateResult,
	type PaginateOptions,
} from "../helpers/pagination";
import { RequestProxy } from "../helpers/request";

export class Controller {
	/** Active request context — set by the router before each handler call. */
	declare ctx: Context;

	/** Database client. Configured via `app.use(DrizzleModule)`. */
	declare db: DbClient;

	/** Named databases (multi-database support). */
	declare dbs: Record<string, DbClient>;

	/** Session — cookie-based, `this.session.get/set/delete/clear`. */
	declare session: Session;

	/** Auth — `this.auth.user()`, `this.auth.login()`, `this.auth.logout()`. */
	declare auth: {
		user: () => any;
		login: (user: any) => void;
		logout: () => void;
		check: () => boolean;
	};

	/** Cache — `this.cache.get/set/delete/remember`. */
	declare cache: Cache;

	/** Queue — `this.queue.dispatch/process`. */
	declare queue: Queue;

	/** Upload — `this.upload.file/files/store`. */
	declare upload: Upload;

	/** Mail — `this.mail.send()`. */
	declare mail: Mail;

	/** HTTP Client — `this.http.get/post/put/delete`. */
	declare http: HttpClient;

	/** Image — `this.image.open(file).resize(w,h).save(path)`. */
	declare image: typeof Image;

	/** Pagination — `this.paginate(data, total, options)`. */
	declare paginate: typeof paginateFn;

	/** Shared props for page rendering. */
	protected _sharedProps: Record<string, any> = {};

	/** Default HTTP client instance. */
	private _http: HttpClient = createHttp();

	/** Paginate helper bound to this controller. */
	protected paginate = paginateFn;

	// ─── Request Shortcuts ───────────────────────────────────────

	/** URL query parameter. */
	protected get query(): Record<string, string | string[]> {
		return this.ctx.query ?? {};
	}

	/** Path parameter. */
	protected param(name: string): string | undefined {
		return (this.ctx.params as Record<string, string | undefined>)?.[name];
	}

	/** Request body (parsed JSON by Elysia). */
	protected get body(): any {
		return (this.ctx as any).body ?? {};
	}

	/** Request headers. */
	protected get headers(): Record<string, string | string[]> {
		return this.ctx.headers ?? {};
	}

	/** Request proxy — CodeIgniter-style input API (input, get, post, only, has, etc.). */
	protected get request(): RequestProxy {
		return new RequestProxy(this.ctx);
	}

	/** Raw Elysia context — escape hatch. */
	protected get ctx_raw(): Context {
		return this.ctx;
	}

	// ─── Response Shortcuts ──────────────────────────────────────

	/** Return JSON response. */
	protected json(data: any, status = 200): Response {
		return new Response(JSON.stringify(data), {
			status,
			headers: { "content-type": "application/json" },
		});
	}

	/** Return text response. */
	protected text(data: string, status = 200): Response {
		return new Response(data, {
			status,
			headers: { "content-type": "text/plain" },
		});
	}

	/** Return HTML response. */
	protected html(data: string, status = 200): Response {
		return new Response(data, {
			status,
			headers: { "content-type": "text/html" },
		});
	}

	/** Redirect to a URL. */
	protected redirect(url: string, status: 301 | 302 = 302): Response {
		return new Response(null, {
			status,
			headers: { location: url },
		});
	}

	/** Return 404. */
	protected notFound(message = "Not Found"): Response {
		return new Response(message, { status: 404 });
	}

	/** Return 401. */
	protected unauthorized(message = "Unauthorized"): Response {
		return new Response(message, { status: 401 });
	}

	/** Return 400 with validation errors. */
	protected badRequest(errors?: any): Response {
		return this.json({ error: "Bad Request", details: errors ?? null }, 400);
	}

	// ─── Lifecycle Hooks ────────────────────────────────────────

	/**
	 * Called before every controller method.
	 * Return a Response to short-circuit (e.g. redirect unauthenticated users).
	 * Return undefined to continue normally.
	 */
	protected _before(): Response | undefined {
		return undefined;
	}

	// ─── Validation Shortcuts ────────────────────────────────────

	// ─── HTTP Client Shortcut ─────────────────────────────────

	/** Make an HTTP GET request. */
	protected async httpGet<T = any>(url: string, options?: any): Promise<T> {
		const res = await this._http.get<T>(url, options);
		return res.data;
	}

	/** Make an HTTP POST request. */
	protected async httpPost<T = any>(
		url: string,
		body?: any,
		options?: any,
	): Promise<T> {
		const res = await this._http.post<T>(url, body, options);
		return res.data;
	}

	/** Make an HTTP PUT request. */
	protected async httpPut<T = any>(
		url: string,
		body?: any,
		options?: any,
	): Promise<T> {
		const res = await this._http.put<T>(url, body, options);
		return res.data;
	}

	/** Make an HTTP DELETE request. */
	protected async httpDelete<T = any>(url: string, options?: any): Promise<T> {
		const res = await this._http.delete<T>(url, options);
		return res.data;
	}

	// ─── Image Manipulation ────────────────────────────────────

	/** Open an image for manipulation. */
	protected imageOpen(path: string): Image {
		return Image.open(path);
	}

	// ─── View (SSR React) ─────────────────────────────────────

	/**
	 * Render a React view component to HTML (server-side).
	 *
	 * The component is loaded from views/ directory and SSR-rendered.
	 *
	 * @param name - View file name (e.g. 'TodoList' → views/TodoList.tsx)
	 * @param props - Props passed to the React component
	 * @param options - Options (title, scripts)
	 *
	 * @example
	 * ```ts
	 * const todos = await this.db.query('SELECT * FROM users')
	 * return this.view('TodoList', { todos: todos.rows }, { title: 'My Todos' })
	 * ```
	 */
	protected view(
		name: string,
		props: Record<string, any> = {},
		options: { title?: string; scripts?: string[] } = {},
	): ViewResponse {
		return new ViewResponse(name, props, options);
	}

	// ─── Page Rendering ────────────────────────────────────────

	/**
	 * Render a page with Inertia-style protocol.
	 *
	 * First request returns full HTML. Subsequent Inertia navigation
	 * returns JSON with component name + props.
	 *
	 * @param component - Component name (e.g. 'Users/Index')
	 * @param props - Component props (data from loader)
	 * @param options - Page options (status, title, layout, flash)
	 *
	 * @example
	 * ```ts
	 * async index() {
	 *   const users = await this.db.query('SELECT * FROM users')
	 *   return this.page('Users/Index', { users }, {
	 *     title: 'Users List',
	 *     flash: { type: 'success', message: 'Loaded!' },
	 *   })
	 * }
	 * ```
	 */
	protected page(
		component: string,
		props: Record<string, any> = {},
		options: PageOptions = {},
	): PageResponse {
		return new PageResponse(component, props, options);
	}

	/** Share a prop across all pages (like Inertia.share). */
	protected share(key: string, value: any): void;
	protected share(props: Record<string, any>): void;
	protected share(keyOrProps: string | Record<string, any>, value?: any): void {
		if (typeof keyOrProps === "string") {
			this._sharedProps[keyOrProps] = value;
		} else {
			Object.assign(this._sharedProps, keyOrProps);
		}
	}

	/**
	 * Validate request body against rules or a Zod schema.
	 *
	 * @example
	 * ```ts
	 * // String rules (CodeIgniter style)
	 * const v = this.validate(this.body, {
	 *   name: 'required|min:2',
	 *   email: 'required|email',
	 * })
	 * if (v.fails()) return this.badRequest(v.errors())
	 *
	 * // Zod schema (TypeScript style)
	 * import { z } from 'zod'
	 * const v = this.validate(this.body, z.object({
	 *   name: z.string().min(2),
	 *   email: z.string().email(),
	 * }))
	 * ```
	 */
	protected validate<T extends Record<string, any>>(
		data: unknown,
		schemaOrRules: z.ZodSchema<T> | Record<string, string>,
	): ValidationResult<T> {
		return validate(data as any, schemaOrRules as any);
	}
}
