/**
 * Load — CI3-style helper & service loader for controllers.
 *
 * Scans project-level directories:
 *   helpers/   → export function (stateless)
 *   services/ → export class   (stateful, instantiated once)
 *
 * @example
 * ```ts
 * // Project structure:
 * //   helpers/format_date.ts     → export function formatDate(date)
 * //   services/payment.ts      → export class PaymentGateway
 *
 * class Orders extends Controller {
 *   async index() {
 *     // Load helper (returns function)
 *     const { formatDate } = await this.load.helper('format_date')
 *     const formatted = formatDate(new Date())
 *
 *     // Load service (instantiates class, cached per request)
 *     const payment = await this.load.service('payment', { apiKey: 'xxx' })
 *     await payment.charge(100)
 *   }
 * }
 * ```
 */
import { existsSync } from "node:fs"
import { join } from "node:path"
import { cwd } from "node:process"

export class LoadService {
	private _helperCache = new Map<string, Record<string, any>>()
	private _serviceCache = new Map<string, any>()
	private _projectDir: string

	constructor(projectDir?: string) {
		this._projectDir = projectDir ?? cwd()
	}

	/**
	 * Load a helper module from the project's helpers/ directory.
	 *
	 * Helpers are stateless function collections.
	 * Subsequent calls return the cached module.
	 *
	 * @param name - File name without extension (e.g. "format_date")
	 * @returns All exports from the helper module
	 *
	 * @example
	 * ```ts
	 * const { formatDate } = await this.load.helper('format_date')
	 * ```
	 */
	async helper(name: string): Promise<Record<string, any>> {
		if (this._helperCache.has(name)) {
			return this._helperCache.get(name)!
		}

		const paths = [
			join(this._projectDir, "helpers", `${name}.ts`),
			join(this._projectDir, "helpers", `${name}.js`),
			join(this._projectDir, "helpers", name, "index.ts"),
			join(this._projectDir, "helpers", name, "index.js"),
		]

		for (const filePath of paths) {
			if (existsSync(filePath)) {
				const mod = await import(filePath)
				this._helperCache.set(name, mod)
				return mod
			}
		}

		throw new Error(`Helper not found: ${name} (looked in helpers/${name}.ts)`)
	}

	/**
	 * Load a service class from the project's services/ directory.
	 *
	 * Services are stateful classes. The class is instantiated with
	 * the provided options on first call and cached for the request.
	 *
	 * @param name - File name without extension (e.g. "payment")
	 * @param options - Constructor options passed to the class
	 * @returns Instance of the service class
	 *
	 * @example
	 * ```ts
	 * const payment = await this.load.service('payment', { apiKey: 'xxx' })
	 * await payment.charge(100)
	 * ```
	 */
	async service<T = any>(name: string, options?: Record<string, any>): Promise<T> {
		const cacheKey = `${name}:${JSON.stringify(options ?? {})}`
		if (this._serviceCache.has(cacheKey)) {
			return this._serviceCache.get(cacheKey) as T
		}

		const paths = [
			join(this._projectDir, "services", `${name}.ts`),
			join(this._projectDir, "services", `${name}.js`),
			join(this._projectDir, "services", name, "index.ts"),
			join(this._projectDir, "services", name, "index.js"),
		]

		for (const filePath of paths) {
			if (existsSync(filePath)) {
				const mod = await import(filePath)
				const ExportedClass = mod.default || Object.values(mod)[0]
				if (typeof ExportedClass === "function" || typeof ExportedClass === "object") {
					const instance = typeof ExportedClass === "function" ? new ExportedClass(options ?? {}) : ExportedClass
					this._serviceCache.set(cacheKey, instance)
					return instance as T
				}
				throw new Error(`Service "${name}" must export a class or default export`)
			}
		}

		throw new Error(`Service not found: ${name} (looked in services/${name}.ts)`)
	}

	/** Clear all cached helpers and services. */
	clear(): void {
		this._helperCache.clear()
		this._serviceCache.clear()
	}
}
