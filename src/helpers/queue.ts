/**
 * Queue — simple in-memory job queue.
 *
 * @example
 * ```ts
 * // In a controller
 * this.queue.dispatch('send_email', { to: 'user@test.com', template: 'welcome' })
 *
 * // Process jobs
 * this.queue.process('send_email', async (job) => {
 *   await mail.send(job.data)
 * })
 * ```
 */
export interface QueueOptions {
	/** Max concurrent workers per queue. Default: 5 */
	maxConcurrency?: number

	/** Poll interval in ms when idle. Default: 1000 */
	pollInterval?: number
}

export interface Job<T = any> {
	id: string
	name: string
	data: T
	attempts: number
	maxAttempts: number
	createdAt: number
}

type JobHandler<T = any> = (job: Job<T>) => Promise<void>

interface QueueState {
	pending: Job[]
	processing: Set<string>
	handlers: Map<string, JobHandler>
	running: boolean
}

/** In-memory queue store. */
const queues = new Map<string, QueueState>()

/**
 * Queue service — dispatch and process background jobs.
 *
 * Usage in a Controller:
 * ```ts
 * this.queue.dispatch('send_email', { to: 'user@test.com' })
 * ```
 */
export class Queue {
	private options: QueueOptions

	constructor(options: QueueOptions = {}) {
		this.options = {
			maxConcurrency: options.maxConcurrency ?? 5,
			pollInterval: options.pollInterval ?? 1000,
		}
	}

	/**
	 * Dispatch a job to a queue.
	 *
	 * @param name - Queue name
	 * @param data - Job payload
	 * @param maxAttempts - Max retry attempts. Default: 3
	 * @returns Job ID
	 */
	dispatch(name: string, data: any, maxAttempts = 3): string {
		const state = getOrCreateQueue(name)
		const job: Job = {
			id: crypto.randomUUID(),
			name,
			data,
			attempts: 0,
			maxAttempts,
			createdAt: Date.now(),
		}
		state.pending.push(job)
		return job.id
	}

	/**
	 * Register a handler for a queue.
	 * Starts processing when a handler is registered.
	 */
	process(name: string, handler: JobHandler): void {
		const state = getOrCreateQueue(name)
		state.handlers.set(name, handler)
		startProcessing(name, state, this.options)
	}

	/**
	 * Get queue status.
	 */
	status(name: string): { pending: number; processing: number } {
		const state = queues.get(name)
		if (!state) return { pending: 0, processing: 0 }
		return {
			pending: state.pending.length,
			processing: state.processing.size,
		}
	}

	/**
	 * Get all queue names.
	 */
	get queues(): string[] {
		return [...queues.keys()]
	}
}

function getOrCreateQueue(name: string): QueueState {
	let state = queues.get(name)
	if (!state) {
		state = {
			pending: [],
			processing: new Set(),
			handlers: new Map(),
			running: false,
		}
		queues.set(name, state)
	}
	return state
}

function startProcessing(name: string, state: QueueState, options: QueueOptions): void {
	if (state.running) return
	state.running = true

	const processNext = async () => {
		if (!state.running) return

		// Check concurrency
		if (state.processing.size >= (options.maxConcurrency ?? 5)) {
			setTimeout(processNext, options.pollInterval ?? 1000)
			return
		}

		const job = state.pending.shift()
		if (!job) {
			setTimeout(processNext, options.pollInterval ?? 1000)
			return
		}

		const handler = state.handlers.get(name)
		if (!handler) {
			// No handler registered — put job back
			state.pending.unshift(job)
			setTimeout(processNext, options.pollInterval ?? 1000)
			return
		}

		state.processing.add(job.id)
		try {
			await handler(job)
		} catch (err) {
			job.attempts++
			if (job.attempts < job.maxAttempts) {
				// Retry with exponential backoff
				const delay = Math.min(1000 * Math.pow(2, job.attempts), 30000)
				setTimeout(() => {
					state.pending.push(job)
				}, delay)
			} else {
				console.error(`[queue] Job ${job.name}/${job.id} failed after ${job.attempts} attempts:`, err)
			}
		} finally {
			state.processing.delete(job.id)
		}

		// Process next job immediately
		setImmediate(processNext)
	}

	processNext()
}

let _queueInstance: Queue | null = null
export function createQueue(options?: QueueOptions): Queue {
	if (!_queueInstance) {
		_queueInstance = new Queue(options)
	}
	return _queueInstance
}
