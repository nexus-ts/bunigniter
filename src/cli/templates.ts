/**
 * Shared template renderer for all `make:*` CLI commands.
 * Single source of truth — update here to affect all generators.
 */
export function render(template: string, data: Record<string, any>): string {
	return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(data[key] ?? ""))
}

/** Route controller template. */
export function controller(name: string, prefix: string): string {
	return render(
		`/**
 * {{Name}} controller
 *
 * GET  {{prefix}}/{{name}}
 * POST {{prefix}}/{{name}}
 * PUT  {{prefix}}/{{name}}/:id
 * DELETE {{prefix}}/{{name}}/:id
 */
import { Controller } from 'bunigniter'

export class {{Name}} extends Controller {
	async index() {
		return this.json({ message: '{{name}} index' })
	}

	async show(id: number) {
		return this.json({ message: '{{name}} show', id })
	}

	async create() {
		const v = this.validate(this.body, {
			// name: 'required'
		})
		if (v.fails()) return this.badRequest(v.errors)
		return this.json({ message: '{{name}} created' }, 201)
	}

	async update(id: number) {
		return this.json({ message: '{{name}} updated', id })
	}

	async destroy(id: number) {
		return this.json({ message: '{{name}} deleted', id })
	}
}
`,
		{ name, Name: name.charAt(0).toUpperCase() + name.slice(1), prefix },
	)
}

/** DB schema template. */
export function model(name: string, columns: string): string {
	const tableName = `${name.toLowerCase()}s`
	const cols = columns
		.split(",")
		.filter(Boolean)
		.map((c: string) => {
			const [colName, colType] = c.trim().split(":")
			return { name: colName || "id", type: colType || "string" }
		})
	const fieldDefs = cols
		.map((c: any) => {
			if (c.type === "number" || c.type === "integer") {
				return `  ${c.name}: integer('${c.name}'),`
			}
			return `  ${c.name}: text('${c.name}'),`
		})
		.join("\n")

	return `import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

export const ${tableName} = sqliteTable('${tableName}', {
  id: integer('id').primaryKey({ autoIncrement: true }),
${fieldDefs}
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})
`
}

/** Migration file template. */
export function migration(name: string): string {
	const _timestamp = Date.now()
	const tableName = `${name
		.toLowerCase()
		.replace(/^create_|^add_|^drop_/, "")
		.replace(/_table$/, "")}s`
	const isCreate = name.toLowerCase().startsWith("create")

	return `-- Migration: ${name}
-- Generated at: ${new Date().toISOString()}

${
	isCreate
		? `CREATE TABLE IF NOT EXISTS ${tableName} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);`
		: `-- Add your migration SQL here
-- ALTER TABLE ${tableName} ADD COLUMN ...;`
}
`
}

/** Middleware template. */
export function middleware(name: string): string {
	return render(
		`/**
 * {{name}} middleware
 */
import { defineMiddleware } from 'bunigniter'

export default defineMiddleware(async (c, next) => {
  const start = performance.now()
  await next()
  const duration = Math.round((performance.now() - start) * 100) / 100
  c.set.headers ??= {}
  c.set.headers['X-{{Name}}-Time'] = \`\${duration}ms\`
})
`,
		{ name, Name: name.charAt(0).toUpperCase() + name.slice(1) },
	)
}

/** CLI command template. */
export function command(name: string): string {
	return render(
		`/**
 * {{name}} command — scaffolded CLI command
 */
import type { CommandArgs } from '../cli/types'

export default {
  name: '{{name}}',
  desc: 'Description for {{name}}',
  async run(args: CommandArgs) {
    console.log('Running {{name}} with args:', args)
  }
}
`,
		{ name },
	)
}

/** Test file template. */
export function test(name: string): string {
	return render(
		`/**
 * {{name}} tests
 */
import { describe, it, expect } from 'vitest'

describe('{{Name}}', () => {
  it('should work', () => {
    expect(1 + 1).toBe(2)
  })
})
`,
		{ name, Name: name.charAt(0).toUpperCase() + name.slice(1) },
	)
}

/** Queue job template. */
export function job(name: string): string {
	return render(
		`/**
 * {{name}} job — queue worker
 */
import type { Job } from 'bunigniter/helpers/queue'

export default async function (job: Job) {
  const { data } = job
  console.log('Processing {{name}} job:', data)
  // Add your job logic here
}
`,
		{ name },
	)
}

/** Mail class template. */
export function mail(name: string): string {
	return render(
		`/**
 * {{name}} mail
 */
export async function send{{Name}}(to: string, data: Record<string, any> = {}) {
  // const { mail } = await import('bunigniter/helpers/mail')
  // await mail.send({ to, subject: '{{Name}}', html: \`<h1>\${data.title}</h1>\` })
  console.log('Sending {{name}} mail to', to, data)
}
`,
		{ name, Name: name.charAt(0).toUpperCase() + name.slice(1) },
	)
}

/** Seeder template. */
export function seeder(name: string): string {
	return render(
		`/**
 * {{name}} seeder
 */
export default async function seed(ctx: any) {
  const { db } = ctx
  // await db.query('INSERT INTO {{name}} (name) VALUES (?)', ['Sample'])
  console.log('Seeding {{name}}...')
}
`,
		{ name },
	)
}

/** Event template. */
export function eventTemplate(name: string): string {
	return render(
		`/**
 * {{name}} event
 */
export class {{Name}} {
  constructor(public readonly data: any) {}
}
`,
		{ name, Name: name.charAt(0).toUpperCase() + name.slice(1) },
	)
}

/** Listener template. */
export function listener(name: string): string {
	return render(
		`/**
 * {{name}} listener
 */
export default async function handle{{Name}}(event: any) {
  console.log('Handling {{name}}:', event.data)
}
`,
		{ name, Name: name.charAt(0).toUpperCase() + name.slice(1) },
	)
}

/** Service provider template. */
export function provider(name: string): string {
	return render(
		`/**
 * {{name}} service provider
 */
export default {
  register() {
    // Register bindings here
  },
  boot() {
    // Run after all providers are registered
  },
}
`,
		{ name },
	)
}

/** Policy template. */
export function policy(name: string): string {
	return render(
		`/**
 * {{name}} policy
 */
export class {{Name}}Policy {
  view(user: any, resource: any) { return true }
  create(user: any) { return true }
  update(user: any, resource: any) { return user.id === resource.user_id }
  delete(user: any, resource: any) { return user.id === resource.user_id }
}
`,
		{ name, Name: name.charAt(0).toUpperCase() + name.slice(1) },
	)
}

/** Form request template. */
export function formRequest(name: string): string {
	return render(
		`/**
 * {{name}} form request
 */
import { z } from 'zod'

export const {{Name}}Schema = z.object({
  // name: z.string().min(2),
  // email: z.string().email(),
})

export type {{Name}}Data = z.infer<typeof {{Name}}Schema>
`,
		{ name, Name: name.charAt(0).toUpperCase() + name.slice(1) },
	)
}

/** API resource template. */
export function resource(name: string): string {
	return render(
		`/**
 * {{name}} API resource
 */
export interface {{Name}} {
  id: number
  // Add fields here
  createdAt: string
  updatedAt: string
}

export function {{name}}ToJson(item: {{Name}}): Record<string, any> {
  return {
    id: item.id,
    // Map fields here
    createdAt: item.createdAt,
  }
}
`,
		{ name, Name: name.charAt(0).toUpperCase() + name.slice(1) },
	)
}

/** Validation rule template. */
export function rule(name: string): string {
	return render(
		`/**
 * {{name}} validation rule
 */
export function {{name}}(value: any, params?: string): string | null {
  if (!value) return null
  // Add validation logic
  // return 'Validation failed'
  return null
}
`,
		{ name },
	)
}
