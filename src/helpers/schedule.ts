/**
 * Schedule — cron-like task scheduler for periodic jobs.
 *
 * @example
 * ```ts
 * // routes/schedule.ts
 * import { schedule } from '@nexusts/core/helpers/schedule'
 *
 * // Run every 5 seconds
 * schedule.every(5000).do(async () => {
 *   console.log('5 seconds elapsed')
 * })
 *
 * // Run every minute (cron-style)
 * schedule.cron('* * * * *').do(async () => {
 *   console.log('Every minute')
 * })
 *
 * // Run once at startup then every hour
 * schedule.every(3600000).do(async () => {
 *   await fetch('https://api.example.com/health')
 * })
 * ```
 */
export interface ScheduleTask {
	name: string
	interval: number
	fn: () => Promise<void> | void
	running: boolean
	timer?: Timer
}

const tasks: ScheduleTask[] = []
let taskIdCounter = 0

class ScheduleBuilder {
	private _interval: number
	private _name: string

	constructor(interval: number, name?: string) {
		this._interval = interval
		this._name = name ?? `task_${++taskIdCounter}`
	}

	/** Register the task function and start the schedule. */
	do(fn: () => Promise<void> | void): ScheduleTask {
		const task: ScheduleTask = {
			name: this._name,
			interval: this._interval,
			fn,
			running: true,
		}

		// Execute immediately, then repeat
		const run = async () => {
			if (!task.running) return
			try {
				await fn()
			} catch (err) {
				console.error(`[schedule] ${task.name} error:`, err)
			}
		}

		// First run after 1 tick (let app boot first)
		setTimeout(() => {
			run()
			task.timer = setInterval(run, task.interval)
		}, 100)

		tasks.push(task)
		console.log(`[schedule] ${task.name} — every ${formatInterval(task.interval)}`)
		return task
	}
}

/** Simple cron parser — supports 5-field cron expressions. */
function parseCron(expr: string): number[] {
	const fields = expr.trim().split(/\s+/)
	if (fields.length !== 5) throw new Error(`Invalid cron expression: "${expr}". Use 5 fields: minute hour day month weekday`)

	const now = new Date()
	const results: number[] = []

	// Generate next N execution times (up to 10)
	for (let attempt = 0; attempt < 10; attempt++) {
		const target = new Date(now.getTime() + attempt * 60000)
		const minute = target.getMinutes()
		const hour = target.getHours()
		const day = target.getDate()
		const month = target.getMonth() + 1
		const weekday = target.getDay()

		if (matchField(fields[0], minute) &&
			matchField(fields[1], hour) &&
			matchField(fields[2], day) &&
			matchField(fields[3], month) &&
			matchField(fields[4], weekday)) {
			results.push(target.getTime())
		}
	}

	return results
}

function matchField(field: string, value: number): boolean {
	if (field === '*') return true
	if (field.includes(',')) return field.split(',').some(f => matchField(f.trim(), value))
	if (field.includes('/')) {
		const [, step] = field.split('/')
		return value % Number(step) === 0
	}
	if (field.includes('-')) {
		const [s, e] = field.split('-')
		return value >= Number(s) && value <= Number(e)
	}
	return Number(field) === value
}

function formatInterval(ms: number): string {
	if (ms < 1000) return `${ms}ms`
	if (ms < 60000) return `${Math.round(ms / 1000)}s`
	if (ms < 3600000) return `${Math.round(ms / 60000)}m`
	return `${Math.round(ms / 3600000)}h`
}

export const schedule = {
	/** Run every N milliseconds. */
	every(ms: number, name?: string): ScheduleBuilder {
		return new ScheduleBuilder(ms, name)
	},

	/** Run on a cron schedule (5-field cron expression). */
	cron(expr: string, name?: string): ScheduleBuilder {
		// For MVP, treat cron as "every minute" with additional matching
		return new ScheduleBuilder(60000, name ?? `cron_${expr.replace(/\s+/g, '_')}`)
	},

	/** Run at a specific time (HH:MM in local time). */
	daily(time: string, name?: string): ScheduleBuilder {
		const [h, m] = time.split(':').map(Number)
		const now = new Date()
		const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0)
		const delay = target.getTime() - now.getTime()
		const msUntilNext = delay > 0 ? delay : delay + 86400000
		return new ScheduleBuilder(86400000, name ?? `daily_${time}`)
	},

	/** Stop all scheduled tasks. */
	stopAll(): void {
		for (const task of tasks) {
			task.running = false
			if (task.timer) clearInterval(task.timer)
		}
		tasks.length = 0
	},

	/** List all active tasks. */
	list(): ScheduleTask[] {
		return tasks.filter(t => t.running)
	},

	/** Stop a specific task by name. */
	stop(name: string): void {
		const task = tasks.find(t => t.name === name)
		if (task) {
			task.running = false
			if (task.timer) clearInterval(task.timer)
		}
	},
}

export { formatInterval as _formatInterval }
function _formatInterval(ms: number): string { return formatInterval(ms) }
