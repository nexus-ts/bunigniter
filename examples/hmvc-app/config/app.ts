import { env } from '@nexusts/core/helpers/env'
export default {
  port: 3005,
  db: { dialect: 'bun-sqlite' as const, connection: { filename: env('DB_FILENAME', 'examples/hmvc-app/data/hmvc.db') } },
  router: { prefix: '', directory: 'routes' },
  view: { directory: 'views' },
  middleware: { logger: { enabled: true } },
}
