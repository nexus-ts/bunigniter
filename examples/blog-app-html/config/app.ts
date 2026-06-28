import { env } from '@nexusts/core/helpers/env'
export default {
  port: env('PORT', 3001),
  db: { dialect: 'bun-sqlite' as const, connection: { filename: env('DB_FILENAME', 'examples/blog-app-html/data/blog.db') } },
  router: { prefix: '', directory: 'routes' },
  view: { directory: 'views' },
  middleware: { logger: { enabled: true } },
}
