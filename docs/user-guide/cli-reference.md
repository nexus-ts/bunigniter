# CLI Reference — NexusTS `nx` vs Laravel `artisan`

NexusTS CLI (`bun run nx`) is inspired by Laravel Artisan and CodeIgniter's CLI.

## Current Commands

| Command | Description | Status |
|---------|-------------|--------|
| `nx` | Show help | ✅ |
| `nx help` | Show help | ✅ |
| `nx list` | List all routes with controller.method | ✅ |
| `nx repl` | Interactive console (db, cache, http) | ✅ |
| `nx make:controller <name>` | Scaffold a route controller | ✅ |
| `nx make:model <name>` | Scaffold DB schema + migration | ✅ |
| `nx build:edge` | Pre-compile routes for edge deployment | ✅ |
| `nx edge:dev` | Run edge app locally | ✅ |

## Laravel Artisan Commands — Comparison

### Already Implemented (✅)

| Laravel `php artisan` | NexusTS `bun run nx` | Notes |
|---|---|---|
| `make:controller` | `make:controller` | Creates route file with CRUD methods |
| `make:model` | `make:model` | Creates DB schema + migration |
| `route:list` | `list` | Shows routes with controller.method |
| `tinker` | `repl` | Interactive console with DB access |

### Missing — High Priority

| Laravel Command | NexusTS | Why |
|----------------|---------|-----|
| `make:migration` | ❌ | Create migration file from schema changes |
| `migrate` | ❌ | Run pending migrations |
| `migrate:rollback` | ❌ | Rollback last migration |
| `db:seed` | ❌ | Run database seeders |
| `make:seeder` | ❌ | Scaffold a seeder file |
| `db:wipe` | ❌ | Drop all tables |
| `serve` | ❌ | Start dev server (already `bun run dev`) |
| `down` / `up` | ❌ | Maintenance mode |

### Missing — Medium Priority

| Laravel Command | NexusTS | Why |
|----------------|---------|-----|
| `make:middleware` | ❌ | Scaffold middleware (manual: create in middleware/) |
| `make:command` | ❌ | Scaffold a new CLI command |
| `make:event` / `make:listener` | ❌ | Scaffold events and listeners |
| `make:job` | ❌ | Scaffold a queue job |
| `make:mail` | ❌ | Scaffold a mail class |
| `make:notification` | ❌ | Scaffold a notification |
| `make:observer` | ❌ | Scaffold a model observer |
| `make:policy` | ❌ | Scaffold an authorization policy |
| `make:provider` | ❌ | Scaffold a service provider |
| `make:request` | ❌ | Scaffold a form request (validation) |
| `make:resource` | ❌ | Scaffold an API resource |
| `make:rule` | ❌ | Scaffold a validation rule |
| `make:test` | ❌ | Scaffold a test file |
| `config:cache` | ❌ | Cache configuration (N/A in Bun) |
| `config:clear` | ❌ | Clear cached config |
| `route:cache` | ❌ | Cache routes |
| `route:clear` | ❌ | Clear cached routes |
| `view:cache` | ❌ | Cache compiled views |
| `view:clear` | ❌ | Clear cached views |
| `storage:link` | ❌ | Create storage symlink |
| `key:generate` | ❌ | Generate APP_KEY |
| `optimize` | ❌ | Optimize for production |

### Missing — Low Priority

| Laravel Command | NexusTS | Why |
|----------------|---------|-----|
| `make:channel` | ❌ | Broadcasting channel |
| `make:console` | ❌ | Console command (alias for make:command) |
| `make:exception` | ❌ | Exception handler |
| `make:factory` | ❌ | Model factory (NexusTS uses Factory in drizzle) |
| `make:scope` | ❌ | Eloquent global scope |
| `notifications:table` | ❌ | Notifications table migration |
| `queue:table` | ❌ | Queue table migration |
| `queue:failed` | ❌ | List failed queue jobs |
| `queue:retry` | ❌ | Retry failed queue jobs |
| `queue:work` | ❌ | Process queue (NexusTS has in-memory queue) |
| `schedule:run` | ❌ | Run scheduled tasks |
| `schedule:list` | ❌ | List scheduled tasks |
| `vendor:publish` | ❌ | Publish vendor assets (N/A) |

## Already Covered by Bun/NexusTS Runtime

These commands don't need a CLI equivalent because Bun or NexusTS handles them natively:

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
Phase 1 (Next):
  nx make:migration          ← Create migration file
  nx db:migrate              ← Run pending migrations
  nx db:seed                 ← Run database seeders
  nx key:generate            ← Generate APP_KEY

Phase 2:
  nx make:middleware          ← Scaffold middleware
  nx make:command             ← Scaffold CLI command
  nx make:test               ← Scaffold test file
  nx db:rollback              ← Rollback migration

Phase 3:
  nx make:job                 ← Scaffold queue job
  nx make:mail                ← Scaffold mail class
  nx queue:work               ← Process queue jobs
  nx schedule:run             ← Run scheduled tasks
```
