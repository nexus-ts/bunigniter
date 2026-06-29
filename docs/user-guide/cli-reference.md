# CLI Reference — Bunigniter `bi` vs Laravel `artisan`

Bunigniter CLI (`bun run bi`) is inspired by Laravel Artisan and CodeIgniter's CLI.

## Current Commands

| Command | Description | Status |
|---------|-------------|--------|
| `bi` | Show help | ✅ |
| `bi help` | Show help | ✅ |
| `bi new [name]` | Interactive project scaffold (runtime, DB, OpenAPI, template) | ✅ |
| `bi init` | Scaffold into current directory (merges existing package.json) | ✅ |
| `bi list` | List all routes with controller.method | ✅ |
| `bi repl` | Interactive console (db, cache, http) | ✅ |
| `bi make:controller <name>` | Scaffold a route controller | ✅ |
| `bi make:model <name>` | Scaffold DB schema + migration | ✅ |
| `bi build:edge` | Pre-compile routes for edge deployment | ✅ |
| `bi edge:dev` | Run edge app locally | ✅ |

## Laravel Artisan Commands — Comparison

### Already Implemented (✅)

| Laravel `php artisan` | Bunigniter `bun run bi` | Notes |
|---|---|---|
| `make:controller` | `make:controller` | Creates route file with CRUD methods |
| `make:model` | `make:model` | Creates DB schema + migration |
| `route:list` | `list` | Shows routes with controller.method |
| `tinker` | `repl` | Interactive console with DB access |

### Also Implemented (✅)

| Laravel `php artisan` | Bunigniter `bun run bi` | Notes |
|---|---|---|
| `make:migration` | `make:migration` | Creates a migration SQL file |
| `migrate` | `db:migrate` | Runs pending migrations |
| `migrate:rollback` | `db:rollback` | Removes last migration file |
| `db:seed` | `db:seed` | Runs seeders |
| `make:seeder` | `make:seeder` | Scaffolds a seeder file |
| `db:wipe` | `db:wipe` | Drops all tables |
| `make:middleware` | `make:middleware` | Scaffolds middleware |
| `make:command` | `make:command` | Scaffolds a CLI command |
| `make:event` / `make:listener` | `make:event` / `make:listener` | Scaffolds events and listeners |
| `make:job` | `make:job` | Scaffolds a queue job |
| `make:mail` | `make:mail` | Scaffolds a mail class |
| `make:policy` | `make:policy` | Scaffolds an authorization policy |
| `make:provider` | `make:provider` | Scaffolds a service provider |
| `make:request` | `make:request` | Scaffolds a form request |
| `make:resource` | `make:resource` | Scaffolds an API resource |
| `make:rule` | `make:rule` | Scaffolds a validation rule |
| `make:test` | `make:test` | Scaffolds a test file |
| `storage:link` | `storage:link` | Creates storage symlink |
| `key:generate` | `key:generate` | Generates APP_KEY |

### Missing — Remaining

| Laravel Command | Bunigniter | Why |
|----------------|---------|-----|
| `make:notification` | ❌ | Scaffold a notification |
| `make:observer` | ❌ | Scaffold a model observer |
| `serve` | ❌ | Start dev server (already `bun run dev`) |
| `down` / `up` | ❌ | Maintenance mode |
| `config:cache` | ❌ | Cache configuration (N/A in Bun) |
| `config:clear` | ❌ | Clear cached config |
| `route:cache` | ❌ | Cache routes |
| `route:clear` | ❌ | Clear cached routes |
| `view:cache` | ❌ | Cache compiled views |
| `view:clear` | ❌ | Clear cached views |
| `optimize` | ❌ | Optimize for production |
| `make:channel` | ❌ | Broadcasting channel |
| `make:console` | ❌ | Console command (alias for make:command) |
| `make:exception` | ❌ | Exception handler |
| `make:factory` | ❌ | Model factory (Bunigniter uses Factory in drizzle) |
| `make:scope` | ❌ | Eloquent global scope |
| `notifications:table` | ❌ | Notifications table migration |
| `queue:table` | ❌ | Queue table migration |
| `queue:failed` | ❌ | List failed queue jobs |
| `queue:retry` | ❌ | Retry failed queue jobs |
| `queue:work` | ❌ | Process queue (Bunigniter has in-memory queue) |
| `schedule:run` | ❌ | Run scheduled tasks |
| `schedule:list` | ❌ | List scheduled tasks |
| `vendor:publish` | ❌ | Publish vendor assets (N/A) |

### Missing — Low Priority

| Laravel Command | Bunigniter | Why |
|----------------|---------|-----|
| `make:channel` | ❌ | Broadcasting channel |
| `make:console` | ❌ | Console command (alias for make:command) |
| `make:exception` | ❌ | Exception handler |
| `make:factory` | ❌ | Model factory (Bunigniter uses Factory in drizzle) |
| `make:scope` | ❌ | Eloquent global scope |
| `notifications:table` | ❌ | Notifications table migration |
| `queue:table` | ❌ | Queue table migration |
| `queue:failed` | ❌ | List failed queue jobs |
| `queue:retry` | ❌ | Retry failed queue jobs |
| `queue:work` | ❌ | Process queue (Bunigniter has in-memory queue) |
| `schedule:run` | ❌ | Run scheduled tasks |
| `schedule:list` | ❌ | List scheduled tasks |
| `vendor:publish` | ❌ | Publish vendor assets (N/A) |

## Already Covered by Bun/Bunigniter Runtime

These commands don't need a CLI equivalent because Bun or Bunigniter handles them natively:

| Feature | How |
|---------|-----|
| Dev server | `bun run dev` (hot reload) |
| Testing | `bun run test` (Vitest) |
| Type checking | `bun run typecheck` (tsc) |
| Build | `bun run build` (Bun.build) |
| Package management | `bun add` / `bun remove` |
| Production serve | `bun run start` |
| ENV management | `.env` file + `env()` helper |
| APP_KEY generation | `bun -e "console.log(btoa(crypto.randomUUID()))"` |

## Proposed Roadmap

```
Next:
  bi make:notification       ← Scaffold a notification
  bi make:observer           ← Scaffold a model observer
  bi schedule:list            ← List scheduled tasks
  bi openapi:serve            ← Serve OpenAPI docs UI
```
