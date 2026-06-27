/**
 * Mail — email sending with SMTP, File, and Null transports.
 *
 * @example
 * ```ts
 * // In a controller
 * await this.mail.send({
 *   to: 'user@test.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Hello</h1>',
 * })
 *
 * // With a transport
 * await this.mail.transport('smtp').send({
 *   to: 'user@test.com',
 *   subject: 'Hi',
 *   text: 'Hello world',
 * })
 * ```
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { env } from './env'

// ─── Types ─────────────────────────────────────────────────────

export interface MailMessage {
	to: string | string[]
	from?: string
	subject: string
	text?: string
	html?: string
	cc?: string | string[]
	bcc?: string | string[]
	replyTo?: string
	attachments?: MailAttachment[]
	headers?: Record<string, string>
}

export interface MailAttachment {
	filename: string
	content: Buffer | string
	contentType?: string
}

export interface MailOptions {
	/** Default from address. */
	defaultFrom?: string

	/** Default transport. */
	transport?: MailTransport

	/** Storage directory for file transport. Default: 'storage/mail' */
	storageDir?: string
}

// ─── Transports ─────────────────────────────────────────────────

export interface MailTransport {
	name: string
	send(message: MailMessage): Promise<void>
}

/**
 * Null transport — discards all messages (for testing).
 */
export class NullTransport implements MailTransport {
	name = 'null'
	async send(_message: MailMessage): Promise<void> {
		// Discard
	}
}

/**
 * File transport — writes messages to disk (for development).
 */
export class FileTransport implements MailTransport {
	name = 'file'
	private dir: string

	constructor(dir?: string) {
		this.dir = dir ?? join(process.cwd(), 'storage/mail')
	}

	async send(message: MailMessage): Promise<void> {
		if (!existsSync(this.dir)) {
			mkdirSync(this.dir, { recursive: true })
		}

		const filename = `${Date.now()}_${message.subject.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)}.json`
		const content = JSON.stringify(message, null, 2)
		writeFileSync(join(this.dir, filename), content, 'utf-8')
	}
}

/**
 * SMTP transport — sends via SMTP server.
 * Uses Bun's built-in SMTP or a lightweight client.
 */
export class SmtpTransport implements MailTransport {
	name = 'smtp'
	private host: string
	private port: number
	private user: string
	private pass: string
	private secure: boolean

	constructor(options: {
		host?: string
		port?: number
		user?: string
		pass?: string
		secure?: boolean
	} = {}) {
		this.host = options.host ?? env('SMTP_HOST', 'localhost')
		this.port = options.port ?? Number(env('SMTP_PORT', '587'))
		this.user = options.user ?? env('SMTP_USER', '')
		this.pass = options.pass ?? env('SMTP_PASS', '')
		this.secure = options.secure ?? env('SMTP_SECURE', false)
	}

	async send(message: MailMessage): Promise<void> {
		// Build email content
		const from = message.from ?? env('MAIL_FROM', 'noreply@localhost')
		const to = Array.isArray(message.to) ? message.to.join(', ') : message.to

		let headers = `From: ${from}\nTo: ${to}\nSubject: ${message.subject}\n`
		if (message.cc) {
			headers += `Cc: ${Array.isArray(message.cc) ? message.cc.join(', ') : message.cc}\n`
		}
		if (message.replyTo) {
			headers += `Reply-To: ${message.replyTo}\n`
		}
		headers += 'MIME-Version: 1.0\n'

		let body = ''
		if (message.html) {
			headers += 'Content-Type: text/html; charset=UTF-8\n'
			body = message.html
		} else if (message.text) {
			headers += 'Content-Type: text/plain; charset=UTF-8\n'
			body = message.text
		}

		const raw = `${headers}\n${body}`

		// Send via SMTP using Bun's TCP socket
		try {
			const { connect } = await import('node:net')
			await new Promise<void>((resolve, reject) => {
				const socket = connect(this.port, this.host, () => {
					let buffer = ''
					let step = 0

					const send = (cmd: string) => {
						socket.write(cmd + '\r\n')
					}

					socket.on('data', (data: Buffer) => {
						buffer += data.toString()
						const lines = buffer.split('\r\n')
						buffer = lines.pop() ?? ''

						for (const line of lines) {
							if (line.startsWith('220') && step === 0) {
								step = 1
								send(`EHLO ${this.host}`)
							} else if (line.startsWith('250') && step === 1) {
								if (this.user && this.pass) {
									step = 2
									send('AUTH LOGIN')
								} else {
									step = 3
									send(`MAIL FROM:<${from}>`)
								}
							} else if (line.startsWith('334') && step === 2) {
								send(Buffer.from(this.user).toString('base64'))
								step = 21
							} else if (line.startsWith('334') && step === 21) {
								send(Buffer.from(this.pass).toString('base64'))
								step = 22
							} else if (line.startsWith('235') && step === 22) {
								step = 3
								send(`MAIL FROM:<${from}>`)
							} else if (line.startsWith('250') && step === 3) {
								step = 4
								send(`RCPT TO:<${to}>`)
							} else if (line.startsWith('250') && step === 4) {
								step = 5
								send('DATA')
							} else if (line.startsWith('354') && step === 5) {
								step = 6
								send(raw + '\r\n.')
							} else if (line.startsWith('250') && step === 6) {
								step = 7
								send('QUIT')
							} else if (line.startsWith('221') && step === 7) {
								socket.end()
								resolve()
							}
						}
					})

					socket.on('error', reject)
				})

				setTimeout(() => {
					socket.destroy()
					reject(new Error('SMTP connection timed out'))
				}, 10000)
			})
		} catch (err) {
			// Fall back to file transport on error
			const fallback = new FileTransport(this.dir)
			await fallback.send(message)
		}
	}

	private get dir(): string {
		return join(process.cwd(), 'storage/mail')
	}
}

// ─── Mail Service ───────────────────────────────────────────────

/**
 * Mail service — send emails with configurable transport.
 *
 * Usage in a Controller:
 * ```ts
 * await this.mail.send({
 *   to: 'user@test.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Hello</h1>',
 * })
 * ```
 */
export class Mail {
	private options: MailOptions
	private _transport: MailTransport

	constructor(options: MailOptions = {}) {
		this.options = options
		this._transport = options.transport ?? new NullTransport()
	}

	/**
	 * Send an email.
	 */
	async send(message: MailMessage): Promise<void> {
		const msg: MailMessage = {
			...message,
			from: message.from ?? this.options.defaultFrom ?? env('MAIL_FROM', 'noreply@localhost'),
		}
		await this._transport.send(msg)
	}

	/**
	 * Send with a specific transport (one-off override).
	 */
	async transport(transport: MailTransport): Promise<void> {
		this._transport = transport
	}
}

let _mailInstance: Mail | null = null
export function createMail(options?: MailOptions): Mail {
	if (!_mailInstance) {
		_mailInstance = new Mail(options)
	}
	return _mailInstance
}
