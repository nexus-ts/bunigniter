# NexusTS — AI Development Guide

Read `AGENTS.md` for the complete framework overview and conventions.

## Quick Skills

| File | Topic |
|------|-------|
| `skills/controller.md` | Creating routes and controllers |
| `skills/database.md` | Query builder (CI-style CRUD) |
| `skills/templates.md` | Rendu / MDX / React SSR |
| `skills/auth.md` | Session auth, JWT, validation |
| `skills/hmvc.md` | HMVC modules |
| `skills/cli.md` | 25 CLI commands |
| `skills/realtime.md` | WebSocket and SSE |
| `skills/openapi.md` | API documentation |

## Always use

- Import from `@nexusts/core` — NOT relative paths
- Controllers in `routes/` — NOT `pages/`
- Templates in `views/` — NOT `routes/`
