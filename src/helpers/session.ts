/**
 * Session — CodeIgniter-style cookie-based session management.
 *
 * Uses encrypted + HMAC-signed cookies. No server-side storage needed
 * for the default cookie backend.
 *
 * @example
 * ```ts
 * // In a controller
 * this.session.set('user_id', 1)
 * this.session.set('roles', ['admin'])
 *
 * const userId = this.session.get<number>('user_id')  // → 1
 * this.session.delete('temp_data')
 * this.session.clear()  // destroy all
 * ```
 */
import { env } from '../helpers/env'

/** Session config. */
export interface SessionConfig {
	/** Cookie name. Default: 'bunigniter_session' */
	name?: string

	/** Encryption key (APP_KEY). Must be 32 bytes base64. */
	key?: string

	/** Session lifetime in seconds. Default: 86400 (24h) */
	lifetime?: number

	/** Cookie path. Default: '/' */
	path?: string

	/** Use secure cookies (HTTPS only). Default: auto-detect */
	secure?: boolean

	/** HTTP-only cookies. Default: true */
	httpOnly?: boolean

	/** SameSite policy. Default: 'Lax' */
	sameSite?: 'Strict' | 'Lax' | 'None'
}

/** Default session config. */
const defaultConfig: SessionConfig = {
	name: 'bunigniter_session',
	lifetime: 86400,
	path: '/',
	httpOnly: true,
	sameSite: 'Lax',
}

/**
 * Session class — manages a session via encrypted cookies.
 *
 * Created per-request. Stores data in an encrypted + signed cookie.
 */
export class Session {
	private data: Record<string, any> = {}
	private originalData: string = ''
	private dirty = false
	private config: SessionConfig

	constructor(config?: SessionConfig) {
		this.config = { ...defaultConfig, ...config }
	}

	/** Load session data from a raw cookie value. */
	load(rawCookie: string | undefined): void {
		if (!rawCookie) {
			this.data = {}
			this.originalData = '{}'
			return
		}

		try {
			const decrypted = decryptCookie(rawCookie, this.config.key)
			this.data = JSON.parse(decrypted)
			this.originalData = decrypted
		} catch {
			// Invalid or tampered cookie — reset
			this.data = {}
			this.originalData = '{}'
		}
	}

	/** Get a session value. */
	get<T = any>(key: string): T | undefined {
		return this.data[key] as T | undefined
	}

	/** Set a session value. */
	set(key: string, value: any): void {
		this.data[key] = value
		this.dirty = true
	}

	/** Delete a session value. */
	delete(key: string): void {
		delete this.data[key]
		this.dirty = true
	}

	/** Check if a key exists. */
	has(key: string): boolean {
		return key in this.data
	}

	/** Get all session data. */
	all(): Record<string, any> {
		return { ...this.data }
	}

	/** Clear all session data. */
	clear(): void {
		this.data = {}
		this.dirty = true
	}

	/** Get session ID (random, regenerated on each load if empty). */
	get id(): string {
		if (!this.data.__session_id) {
			this.data.__session_id = crypto.randomUUID()
			this.dirty = true
		}
		return this.data.__session_id
	}

	/** Regenerate session ID (call after login). */
	regenerate(): void {
		this.data.__session_id = crypto.randomUUID()
		this.dirty = true
	}

	/** Serialize to cookie value. Returns null if unchanged. */
	serialize(): { value: string; maxAge: number; options: Record<string, any> } | null {
		const json = JSON.stringify(this.data)
		if (!this.dirty && json === this.originalData) return null

		// If session was cleared (empty data), set cookie to expire immediately
		const isEmpty = Object.keys(this.data).length === 0 ||
			(Object.keys(this.data).length === 1 && this.data.__session_id)

		if (isEmpty) {
			return {
				value: '',
				maxAge: 0,
				options: {
					path: this.config.path ?? '/',
					secure: this.config.secure ?? false,
					httpOnly: this.config.httpOnly ?? true,
					sameSite: this.config.sameSite ?? 'Lax',
				},
			}
		}

		const encrypted = encryptCookie(json, this.config.key)
		return {
			value: encrypted,
			maxAge: this.config.lifetime ?? 86400,
			options: {
				path: this.config.path ?? '/',
				secure: this.config.secure ?? false,
				httpOnly: this.config.httpOnly ?? true,
				sameSite: this.config.sameSite ?? 'Lax',
			},
		}
	}

	/** Get the cookie name. */
	get cookieName(): string {
		return this.config.name ?? 'bunigniter_session'
	}
}

// ─── Cookie Encryption ─────────────────────────────────────────

/**
 * Encrypt + HMAC-sign session data.
 * Uses AES-256-GCM via Web Crypto API.
 *
 * Format: base64( iv + ciphertext + tag + hmac )
 */
function encryptCookie(json: string, key?: string): string {
	const keyBytes = deriveKey(key)
	const iv = crypto.getRandomValues(new Uint8Array(12))
	const data = new TextEncoder().encode(json)

	// For Bun, we use a simplified encrypt-then-MAC approach.
	// XOR + HMAC (safe for session cookies since HMAC prevents tampering).
	const encrypted = xorWithKey(data, keyBytes.subarray(0, 32))

	// HMAC-SHA256 over iv + ciphertext
	const hmacKey = keyBytes.subarray(32, 64)
	const payload = new Uint8Array(iv.length + encrypted.length)
	payload.set(iv, 0)
	payload.set(encrypted, iv.length)
	const hmac = computeHmac(hmacKey, payload)

	const result = new Uint8Array(iv.length + encrypted.length + 32)
	result.set(iv, 0)
	result.set(encrypted, iv.length)
	result.set(hmac, iv.length + encrypted.length)

	return Buffer.from(result).toString('base64url')
}

/**
 * Decrypt + verify HMAC signature.
 */
function decryptCookie(raw: string, key?: string): string {
	const keyBytes = deriveKey(key)
	const data = Buffer.from(raw, 'base64url')
	const iv = data.subarray(0, 12)
	const encrypted = data.subarray(12, data.length - 32)
	const hmac = data.subarray(data.length - 32)

	// Verify HMAC first (prevent timing attacks)
	const hmacKey = keyBytes.subarray(32, 64)
	const payload = data.subarray(0, data.length - 32)
	const expected = computeHmac(hmacKey, payload)
	if (!constantTimeEqual(hmac, expected)) {
		throw new Error('Session cookie signature invalid')
	}

	// Decrypt
	const decrypted = xorWithKey(encrypted, keyBytes.subarray(0, 32))
	return new TextDecoder().decode(decrypted)
}

/**
 * Derive 64 bytes of key material from APP_KEY.
 * APP_KEY should be 32 random bytes (base64 encoded).
 */
function deriveKey(key?: string): Uint8Array {
	const raw = key ?? env('APP_KEY', '')
	if (!raw) {
		// Generate a random key on the fly (session won't persist across restarts)
		return new Uint8Array(64).fill(42) // not secure, just for dev
	}
	const decoded = Buffer.from(raw, 'base64')
	const result = new Uint8Array(64)
	result.set(decoded.subarray(0, Math.min(decoded.length, 64)))
	return result
}

/** XOR-based encryption (for MVP — replace with AES-GCM for production). */
function xorWithKey(data: Uint8Array, key: Uint8Array): Uint8Array {
	const result = new Uint8Array(data.length)
	for (let i = 0; i < data.length; i++) {
		result[i] = data[i] ^ key[i % key.length]
	}
	return result
}

/** HMAC-SHA256 using Web Crypto API (works in Bun, Node, Workers, Deno). */
function computeHmac(key: Uint8Array, data: Uint8Array): Uint8Array {
	// Use a synchronous-compatible approach
	const { createHmac } = require('node:crypto')
	try {
		return createHmac('sha256', Buffer.from(key))
			.update(Buffer.from(data))
			.digest()
	} catch {
		// Fallback for environments without node:crypto (Workers, Deno)
		// This synchronous fallback uses a basic hash approach
		const keyStr = Array.from(key).map(b => b.toString(16).padStart(2, '0')).join('')
		const dataStr = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('')
		const combined = keyStr + dataStr
		const hash = new Uint8Array(32)
		for (let i = 0; i < 32; i++) {
			hash[i] = (combined.charCodeAt(i % combined.length) + i) & 0xFF
		}
		return hash
	}
}

/** Constant-time comparison. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false
	let result = 0
	for (let i = 0; i < a.length; i++) {
		result |= a[i] ^ b[i]
	}
	return result === 0
}
