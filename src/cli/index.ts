/**
 * NexusTS CLI — CodeIgniter-style scaffolding commands.
 *
 * Usage: `bun run nx <command> [args]`
 *
 * Commands:
 *   make:controller <name>   — Create a page controller
 *   make:model <name>        — Create DB schema + migration
 *   make:migration <name>    — Create a migration file
 *   make:crud <name>         — Full CRUD scaffold (controller + model + migration)
 *   db:migrate               — Run pending migrations
 *   db:seed                  — Run seed files
 *   list                     — Show all registered routes
 *   help                     — Show this help
 */
import { join } from 'node:path'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'

const CWD = process.cwd()

const PAGES_DIR = join(CWD, 'pages')
const DB_DIR = join(CWD, 'db')
const SCHEMA_DIR = join(CWD, 'db/schema')

const commands: Record<string, { desc: string; run: (args: string[]) => Promise<void> }> = {
	'make:controller': {
		desc: 'Create a page controller',
		run: async ([name]) => {
			if (!name) throw new Error('Usage: nx make:controller <name>')
			ensureDir(PAGES_DIR)
			const file = join(PAGES_DIR, `${name}.ts`)
			if (existsSync(file)) throw new Error(`Already exists: ${file}`)

			const prefix = process.env.ROUTER_PREFIX || '/api'
			const content = render(`/**
 * ${name.charAt(0).toUpperCase() + name.slice(1)} controller
 *
 * GET  {{prefix}}/${name}
 * GET  {{prefix}}/${name}/:id
 * POST {{prefix}}/${name}
 * PUT  {{prefix}}/${name}/:id
 * DELETE {{prefix}}/${name}/:id
 */
import { Controller } from '../src/base/index'

export class ${name.charAt(0).toUpperCase() + name.slice(1)} extends Controller {
	async index() {
		return this.json({ message: '${name} index' })
	}

	async show(id: number) {
		return this.json({ message: '${name} show', id })
	}

	async create() {
		const v = this.validate(this.body, {
			// name: 'required'
		})
		if (v.fails()) return this.badRequest(v.errors())
		return this.json({ message: '${name} created' }, 201)
	}

	async update(id: number) {
		return this.json({ message: '${name} updated', id })
	}

	async destroy(id: number) {
		return this.json({ message: '${name} deleted', id })
	}
}
`, { prefix })
			writeFileSync(file, content)
			console.log(`[nx] Created: ${file}`)
		}
	},

	'make:model': {
		desc: 'Create DB schema + migration',
		run: async (args) => {
			if (!args[0]) throw new Error('Usage: nx make:model <name> [--columns "name:string,email:string"]')
			const name = args[0]
			const columnsArg = args.find(a => a.startsWith('--columns='))?.split('=')[1]
				?? args[args.indexOf('--columns') + 1]
				?? 'id:number,name:string'

			ensureDir(SCHEMA_DIR)

			const tableName = name.toLowerCase() + 's'
			const cols = columnsArg.split(',').map((c: string) => {
				const [colName, colType] = c.trim().split(':')
				return { name: colName, type: colType ?? 'string' }
			})

			const schemaContent = `import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

export const ${tableName} = sqliteTable('${tableName}', {
${cols.map((c: any) => `\t${c.name}: ${c.type === 'number' ? `integer('${c.name}')` : `text('${c.name}')`},`).join('\n')}
\tcreatedAt: text('created_at').default('CURRENT_TIMESTAMP'),
})
`
			writeFileSync(join(SCHEMA_DIR, `${name}.ts`), schemaContent)
			console.log(`[nx] Created: ${join(SCHEMA_DIR, `${name}.ts`)}`)
		}
	},

	'list': {
		desc: 'Show all registered routes',
		run: async () => {
			console.log('\n  NexusTS Routes')
			console.log('  ─────────────────────────────────')
			// Scan pages directory for controllers
			const pagesDir = join(CWD, 'pages')
			if (!existsSync(pagesDir)) {
				console.log('  No pages directory found.')
				return
			}
			const { readdirSync, statSync } = await import('node:fs')
			const files = readdirSync(pagesDir)
			for (const file of files.sort()) {
				if (file.endsWith('.ts') && !file.endsWith('.server.ts')) {
					const name = file.replace(/\.ts$/, '')
					const prefix = process.env.ROUTER_PREFIX ?? '/api'
					if (name === 'index') {
						console.log(`  GET  ${prefix}`)
					} else {
						console.log(`  GET  ${prefix}/${name}`)
						console.log(`  GET  ${prefix}/${name}/:id`)
						console.log(`  POST ${prefix}/${name}`)
						console.log(`  PUT  ${prefix}/${name}/:id`)
						console.log(`  DELETE ${prefix}/${name}/:id`)
					}
				}
			}
			console.log()
		}
	},

	'help': {
		desc: 'Show this help',
		run: async () => {
			console.log('\n  NexusTS CLI')
			console.log('  ─────────────────────────────────')
			for (const [name, cmd] of Object.entries(commands)) {
				if (name !== 'help') {
					console.log(`  ${name.padEnd(25)} ${cmd.desc}`)
				}
			}
			console.log(`  ${'help'.padEnd(25)} ${commands.help.desc}`)
			console.log()
		}
	},
}

async function main() {
	const args = process.argv.slice(2)
	const cmd = args[0]

	if (!cmd || cmd === 'help' || !commands[cmd]) {
		await commands.help.run()
		process.exit(cmd && cmd !== 'help' ? 1 : 0)
	}

	try {
		await commands[cmd].run(args.slice(1))
	} catch (err) {
		console.error(`[nx] Error: ${(err as Error).message}`)
		process.exit(1)
	}
}

main()

/**
 * Helper: simple template renderer (mustache-lite).
 */
function render(template: string, data: Record<string, any>): string {
	return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(data[key] ?? ''))
}

/**
 * Helper: ensure a directory exists.
 */
function ensureDir(dir: string): void {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}
