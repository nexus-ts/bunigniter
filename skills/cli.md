# CLI Commands

```bash
bun run bi <command> [args]
```

## New Project

```
new [name]      Create new project in new directory
                Prompts: runtime, database, OpenAPI, template, install

init            Scaffold into current directory (merges existing package.json)
                Same prompts as `new`, but works in current dir

Both share:     Template source: src/cli/scaffold.ts
```

## Scaffolding

```
make:controller <name>     routes/<name>.ts
make:model <name>          db/schema/<name>.ts
make:migration <name>      db/migrations/<ts>_<name>.sql
make:seeder <name>         db/seeds/<name>.ts
make:middleware <name>     middleware/<name>.ts
make:test <name>           tests/<name>.test.ts
make:command <name>        commands/<name>.ts
make:job <name>            jobs/<name>.ts
make:mail <name>           mails/<name>.ts
make:event <name>          events/<name>.ts
make:listener <name>       listeners/<name>.ts
make:provider <name>       providers/<name>.ts
make:policy <name>         policies/<name>.ts
make:request <name>        requests/<name>.ts
make:resource <name>       resources/<name>.ts
make:rule <name>           rules/<name>.ts
```

## Database

```
db:migrate        Run pending migrations
db:rollback       Rollback last migration
db:seed           Run seeders
db:wipe           Drop all tables (DESTRUCTIVE)
```

## Utility

```
key:generate      Generate APP_KEY for .env
storage:link      Create public/storage → storage/app symlink
build:edge        Pre-compile routes for edge deployment
list              Show all routes
repl              Interactive console
```

- **`src/cli/templates.ts`** — single source of truth for `make:*` scaffolding commands
- **`src/cli/scaffold.ts`** — single source of truth for `bi new` project scaffold
