/**
 * Upload — file upload handling with validation.
 *
 * @example
 * ```ts
 * // In a controller
 * const file = this.upload.file('avatar')
 * if (!file) return this.badRequest({ avatar: 'File is required' })
 *
 * const ext = this.upload.extension(file)
 * const path = this.upload.store(file, 'avatars') // stores in storage/avatars/
 *
 * return this.json({ path })
 * ```
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { env } from './env'

export interface UploadOptions {
	/** Maximum file size in bytes. Default: 10MB */
	maxSize?: number

	/** Allowed MIME types. Default: all */
	allowedMimes?: string[]

	/** Storage directory. Default: 'storage' */
	storageDir?: string

	/** Max files per request. Default: 10 */
	maxFiles?: number
}

export interface UploadedFile {
	/** Original field name. */
	field: string

	/** File name from the client. */
	name: string

	/** File size in bytes. */
	size: number

	/** MIME type. */
	type: string

	/** Temporary path in Bun's temp. */
	path?: string

	/** File buffer (for small files). */
	buffer?: ArrayBuffer
}

/**
 * Upload service — handle file uploads.
 *
 * Usage in a Controller:
 * ```ts
 * const file = this.upload.file('avatar')
 * if (file) {
 *   const path = this.upload.store(file, 'avatars')
 *   return this.json({ path })
 * }
 * ```
 */
export class Upload {
	private options: UploadOptions

	constructor(options: UploadOptions = {}) {
		this.options = {
			maxSize: options.maxSize ?? 10 * 1024 * 1024, // 10MB
			allowedMimes: options.allowedMimes ?? [],
			storageDir: options.storageDir ?? env('STORAGE_DIR', 'storage'),
			maxFiles: options.maxFiles ?? 10,
		}
	}

	/**
	 * Get a single uploaded file from the request.
	 *
	 * @param body - Parsed body (use `this.body` or `ctx.body` in Elysia)
	 * @param field - Form field name
	 */
	file(body: any, field: string): UploadedFile | null {
		if (!body || !body[field]) return null

		const raw = body[field]
		// Handle both Bun's File API and plain objects
		if (raw instanceof File || raw?.name !== undefined) {
			const file: UploadedFile = {
				field,
				name: raw.name ?? 'unknown',
				size: raw.size ?? 0,
				type: raw.type ?? 'application/octet-stream',
				buffer: raw instanceof File ? undefined : undefined,
			}

			// Validate size
			if (file.size > this.options.maxSize!) {
				throw new Error(`File "${field}" exceeds maximum size of ${this.options.maxSize} bytes`)
			}

			// Validate MIME type
			if (this.options.allowedMimes!.length > 0 && !this.options.allowedMimes!.includes(file.type)) {
				throw new Error(`File type "${file.type}" is not allowed for field "${field}"`)
			}

			return file
		}

		return null
	}

	/**
	 * Get multiple uploaded files from the request.
	 */
	files(body: any, field: string): UploadedFile[] {
		const result: UploadedFile[] = []
		const raw = body?.[field]
		if (!raw) return result

		const items = Array.isArray(raw) ? raw : [raw]
		for (const item of items) {
			const file = this.file({ [field]: item }, field)
			if (file) result.push(file)
		}

		return result
	}

	/**
	 * Get file extension from the original name.
	 */
	extension(file: UploadedFile): string {
		return extname(file.name).toLowerCase()
	}

	/**
	 * Store a file to disk.
	 *
	 * @param file - Uploaded file
	 * @param subdir - Subdirectory within storage dir (e.g. 'avatars')
	 * @returns The stored file path relative to storage dir
	 */
	store(file: UploadedFile, subdir = ''): string {
		const storageDir = join(process.cwd(), this.options.storageDir!, subdir)
		if (!existsSync(storageDir)) {
			mkdirSync(storageDir, { recursive: true })
		}

		const ext = this.extension(file)
		const filename = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}${ext}`
		const fullPath = join(storageDir, filename)

		// Write file
		if (file.buffer) {
			writeFileSync(fullPath, Buffer.from(file.buffer))
		} else if (file.path) {
			const { copyFileSync } = require('node:fs')
			copyFileSync(file.path, fullPath)
		}

		return subdir ? `${subdir}/${filename}` : filename
	}

	/** Get the configured max upload size. */
	get maxSize(): number {
		return this.options.maxSize!
	}
}

let _uploadInstance: Upload | null = null
export function createUpload(options?: UploadOptions): Upload {
	if (!_uploadInstance) {
		_uploadInstance = new Upload(options)
	}
	return _uploadInstance
}
