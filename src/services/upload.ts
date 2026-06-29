/**
 * Upload — file upload handling with validation.
 *
 * Usage in a Controller:
 * ```ts
 * // Auto-detect body from context (recommended)
 * const file = await this.upload.file('avatar')
 *
 * // Or explicitly pass body
 * const file = this.upload.file(this.body, 'avatar')
 *
 * if (!file) return this.badRequest({ avatar: 'File is required' })
 * if (file.fails()) return this.badRequest({ avatar: file.errors() })
 *
 * const path = await this.upload.store(file, 'avatars')
 * return this.json({ path })
 * ```
 */

import crypto from "node:crypto"
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs"
import { extname, join } from "node:path"
import { env } from "../helpers/env"

export interface UploadOptions {
	/** Maximum file size in bytes. Default: 10MB */
	maxSize?: number

	/** Allowed MIME types. Default: all */
	allowedMimes?: string[]

	/** Allowed file extensions (including dot, e.g. '.jpg'). Default: all */
	allowedExts?: string[]

	/** Storage directory relative to CWD. Default: 'storage' */
	storageDir?: string

	/** Max files per request. Default: 10 */
	maxFiles?: number

	/** Whether to overwrite existing files. Default: false */
	overwrite?: boolean
}

export interface UploadedFile {
	/** Original form field name. */
	field: string

	/** Original file name from the client. */
	name: string

	/** File size in bytes. */
	size: number

	/** MIME type. */
	type: string

	/** Stored path relative to storage dir (set after store()). */
	storedPath?: string

	/** Absolute path on disk (set after store()). */
	absolutePath?: string

	/** Validation errors. */
	_errors?: string[]

	/** Internal: reference to the raw File/Blob object. */
	_raw?: any
}

/**
 * Upload service — handle file uploads with validation and storage.
 */
export class Upload {
	private options: Required<UploadOptions>
	private _body: any

	constructor(options: UploadOptions = {}) {
		this.options = {
			maxSize: options.maxSize ?? 10 * 1024 * 1024,
			allowedMimes: options.allowedMimes ?? [],
			allowedExts: options.allowedExts ?? [],
			storageDir: options.storageDir ?? env("STORAGE_DIR", "storage"),
			maxFiles: options.maxFiles ?? 10,
			overwrite: options.overwrite ?? false,
		}
		this._body = null
	}

	/**
	 * Set the request body for auto-detection.
	 * Called internally by the framework.
	 */
	set body(body: any) {
		this._body = body
	}

	// ─── File Detection ─────────────────────────────────────

	/**
	 * Check if a file was uploaded for the given field.
	 *
	 * @param body - Request body (or omit to auto-detect from controller context)
	 * @param field - Form field name
	 *
	 * @example
	 * ```ts
	 * if (this.upload.hasFile('avatar')) { ... }
	 * if (this.upload.hasFile(this.body, 'avatar')) { ... }
	 * ```
	 */
	hasFile(bodyOrField: any, field?: string): boolean {
		if (field === undefined) {
			field = bodyOrField as string
			bodyOrField = this._body
		}
		if (!bodyOrField || typeof bodyOrField !== "object") return false
		const raw = (bodyOrField as Record<string, any>)[field!]
		if (!raw) return false

		if (Array.isArray(raw)) return raw.length > 0 && this._isFile(raw[0])
		return this._isFile(raw)
	}

	// ─── File Retrieval ─────────────────────────────────────

	/**
	 * Get a single uploaded file from the request.
	 *
	 * @param body - Request body, or field name (auto-detect from context)
	 * @param field - Form field name (omit if first arg is field name)
	 *
	 * @example
	 * ```ts
	 * // Auto-detect body from controller context
	 * const file = await this.upload.file('avatar')
	 *
	 * // Explicit body
	 * const file = this.upload.file(this.body, 'avatar')
	 * ```
	 */
	async file(bodyOrField: any, field?: string): Promise<UploadedFile | null> {
		if (field === undefined) {
			field = bodyOrField as string
			bodyOrField = this._body
		}
		if (!bodyOrField || typeof bodyOrField !== "object") return null

		const raw = (bodyOrField as Record<string, any>)[field!]
		if (!raw) return null

		// Handle single file
		if (!Array.isArray(raw)) {
			return this._parseFile(raw, field!)
		}

		// Array but only one item
		if (raw.length === 1) {
			return this._parseFile(raw[0], field!)
		}

		// Multiple files — return first, log warning
		if (raw.length > 1) {
			console.warn(`[upload] Multiple files for field "${field}", use .files() instead`)
			return this._parseFile(raw[0], field!)
		}

		return null
	}

	/**
	 * Get multiple uploaded files from the request.
	 *
	 * @param body - Request body, or field name (auto-detect from context)
	 * @param field - Form field name (omit if first arg is field name)
	 *
	 * @example
	 * ```ts
	 * const files = await this.upload.files('gallery')
	 * for (const file of files) {
	 *   await this.upload.store(file, 'gallery')
	 * }
	 * ```
	 */
	async files(bodyOrField: any, field?: string): Promise<UploadedFile[]> {
		if (field === undefined) {
			field = bodyOrField as string
			bodyOrField = this._body
		}
		if (!bodyOrField || typeof bodyOrField !== "object") return []

		const raw = (bodyOrField as Record<string, any>)[field!]
		if (!raw) return []

		const items = Array.isArray(raw) ? raw : [raw]
		const result: UploadedFile[] = []

		for (const item of items) {
			if (this._isFile(item)) {
				result.push(await this._parseFile(item, field!))
			}
		}

		return result
	}

	// ─── Validation ─────────────────────────────────────────

	/**
	 * Validate a file against configured rules.
	 * Returns error messages array, or empty array if valid.
	 */
	validate(file: UploadedFile): string[] {
		const errors: string[] = []

		// Size check
		if (file.size > this.options.maxSize) {
			const mb = (this.options.maxSize / (1024 * 1024)).toFixed(1)
			errors.push(`File exceeds maximum size of ${mb}MB`)
		}

		// MIME check
		if (this.options.allowedMimes.length > 0 && !this.options.allowedMimes.includes(file.type)) {
			errors.push(`File type "${file.type}" is not allowed`)
		}

		// Extension check
		if (this.options.allowedExts.length > 0) {
			const ext = this.extension(file)
			if (!this.options.allowedExts.includes(ext)) {
				errors.push(`File extension "${ext}" is not allowed (allowed: ${this.options.allowedExts.join(", ")})`)
			}
		}

		return errors
	}

	/** Get file extension from the original name. */
	extension(file: UploadedFile): string {
		return extname(file.name).toLowerCase()
	}

	// ─── Storage ────────────────────────────────────────────

	/**
	 * Store a file to disk.
	 *
	 * @param file - Uploaded file
	 * @param subdir - Subdirectory within storage dir (e.g. 'avatars')
	 * @param filename - Custom filename (without extension). Default: timestamp_random
	 * @returns The stored file path relative to storage dir
	 *
	 * @example
	 * ```ts
	 * const path = await this.upload.store(file, 'avatars')
	 * const path = await this.upload.store(file, 'avatars', 'profile')
	 * // → 'avatars/1748200000_a1b2c3d4.jpg'
	 * // → 'avatars/profile.jpg'
	 * ```
	 */
	async store(file: UploadedFile, subdir = "", filename?: string): Promise<string> {
		const storageDir = join(process.cwd(), this.options.storageDir, subdir)
		if (!existsSync(storageDir)) {
			mkdirSync(storageDir, { recursive: true })
		}

		const ext = this.extension(file)
		const name = filename ? `${filename}${ext}` : `${Date.now()}_${crypto.randomUUID().slice(0, 8)}${ext}`

		const fullPath = join(storageDir, name)

		// Check existing
		if (existsSync(fullPath) && !this.options.overwrite) {
			throw new Error(`File already exists: ${name}`)
		}

		// Write file from various sources
		const buffer = await this._getBuffer(file)
		writeFileSync(fullPath, buffer)

		// Update file metadata
		file.storedPath = subdir ? `${subdir}/${name}` : name
		file.absolutePath = fullPath

		return file.storedPath
	}

	/**
	 * Delete a stored file from disk.
	 *
	 * @param path - Relative path from storage dir (e.g. 'avatars/abc.jpg')
	 * @returns true if deleted, false if not found
	 *
	 * @example
	 * ```ts
	 * await this.upload.delete('avatars/old.jpg')
	 * ```
	 */
	delete(subpath: string): boolean {
		const fullPath = join(process.cwd(), this.options.storageDir, subpath)
		if (!existsSync(fullPath)) return false
		unlinkSync(fullPath)
		return true
	}

	/**
	 * Delete the stored file associated with an UploadedFile.
	 */
	deleteFile(file: UploadedFile): boolean {
		if (!file.absolutePath) return false
		if (!existsSync(file.absolutePath)) return false
		unlinkSync(file.absolutePath)
		return true
	}

	/** Get the configured max upload size in bytes. */
	get maxSize(): number {
		return this.options.maxSize
	}

	/** Get the configured storage directory. */
	get storageDir(): string {
		return this.options.storageDir
	}

	// ─── Internal Helpers ───────────────────────────────────

	/** Check if a raw value looks like a file. */
	private _isFile(raw: any): boolean {
		if (!raw) return false
		return raw instanceof File || raw instanceof Blob || typeof raw?.name === "string"
	}

	/** Parse a raw file value into an UploadedFile. */
	private async _parseFile(raw: any, field: string): Promise<UploadedFile> {
		const file: UploadedFile = {
			field,
			name: raw.name ?? "unknown",
			size: raw.size ?? 0,
			type: raw.type ?? "application/octet-stream",
			_raw: raw,
		}

		// Validate
		const errors = this.validate(file)
		if (errors.length > 0) {
			file._errors = errors
		}

		return file
	}

	/** Extract file buffer from various sources. */
	private async _getBuffer(file: UploadedFile): Promise<Buffer> {
		// Use stored raw reference first
		if (file._raw) {
			if (typeof file._raw.arrayBuffer === "function") {
				const ab = await file._raw.arrayBuffer()
				return Buffer.from(ab)
			}
			if (file._raw instanceof Blob || file._raw instanceof File) {
				const ab = await file._raw.arrayBuffer()
				return Buffer.from(ab)
			}
		}

		// Fallback: search body for matching File object
		if (this._body) {
			for (const key of Object.keys(this._body)) {
				const raw = this._body[key]
				const items = Array.isArray(raw) ? raw : [raw]
				for (const item of items) {
					if (typeof item?.arrayBuffer === "function") {
						try {
							const ab = await item.arrayBuffer()
							return Buffer.from(ab)
						} catch {
							// continue searching
						}
					}
				}
			}
		}

		throw new Error(`Cannot read file buffer for "${file.name}". Ensure multipart form data is properly parsed.`)
	}
}

let _uploadInstance: Upload | null = null

/**
 * Create or retrieve the global Upload instance.
 */
export function createUpload(options?: UploadOptions): Upload {
	if (!_uploadInstance) {
		_uploadInstance = new Upload(options)
	}
	return _uploadInstance
}
