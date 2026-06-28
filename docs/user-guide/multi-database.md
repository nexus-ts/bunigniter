# Multi-Database Support

Connect to multiple databases of different types from a single application.

## Configuration

Define additional databases in `config/app.ts` using the `databases` key:

```ts
export default {
  // Default database (required)
  db: {
    dialect: 'bun-sqlite',
    connection: { filename: 'app.db' },
  },

  // Additional named databases (optional)
  databases: {
    analytics: {
      dialect: 'postgres',
      connection: {
        host: 'analytics.example.com',
        port: 5432,
        user: 'postgres',
        password: process.env.ANALYTICS_DB_PASSWORD,
        database: 'analytics',
      },
    },
    cache: {
      dialect: 'mysql',
      connection: {
        host: 'localhost',
        port: 3306,
        user: 'root',
        database: 'cache',
      },
    },
    logs: {
      dialect: 'bun-sqlite',
      connection: { filename: 'logs.db' },
    },
  },
}
```

## Usage in Controllers

```ts
import { Controller } from 'bunigniter'

export class Dashboard extends Controller {
  async index() {
    // Default database — this.db (configured via `db` key)
    const users = await this.db.get('users')
    const total = await this.db.count('users')

    // Named database — this.dbs.<name>
    // Each named DB is a fully independent DbClient instance
    const pageviews = await this.dbs.analytics.sql`
      SELECT date, count(*) as visits
      FROM pageviews
      WHERE created_at > ${sevenDaysAgo}
      GROUP BY date
      ORDER BY date
    `

    const cacheHit = await this.dbs.cache.first(
      'SELECT value FROM kv_store WHERE key = ?', ['dashboard_stats']
    )

    return this.view('dashboard', { users, pageviews, cacheHit })
  }
}
```

## Mixing Dialects

Each named database can use a different dialect:

```ts
databases: {
  // SQLite for local data
  local: {
    dialect: 'bun-sqlite',
    connection: { filename: 'data/local.db' },
  },
  // PostgreSQL for production
  production: {
    dialect: 'postgres',
    connection: { host: '...', database: 'prod' },
  },
  // MySQL for legacy
  legacy: {
    dialect: 'mysql',
    connection: { host: '...', database: 'old_system' },
  },
  // Cloudflare D1 for edge
  edge: {
    dialect: 'd1',
    connection: { binding: 'DB' },
  },
}
```

## Cross-Database Transactions

For operations spanning multiple databases, use each DB's own transaction:

```ts
async transfer() {
  await this.dbs.primary.transaction(async (tx) => {
    await tx.insert('orders', { user_id: 1, total: 99 })
  })

  await this.dbs.analytics.transaction(async (tx) => {
    await tx.insert('events', { type: 'order_placed' })
  })
}
```

> Note: Cross-database transactions (XA) are not supported. Each database
> manages its own transaction independently.

## Checking Available Databases

```ts
const names = Object.keys(this.dbs)
// → ['analytics', 'cache', 'logs']
```

## Default vs Named

| Access | Source | Config Key |
|--------|--------|-----------|
| `this.db` | Default connection | `db` |
| `this.dbs.analytics` | Named connection | `databases.analytics` |

Both `this.db` and `this.dbs.<name>` share the same `DbClient` API:
`get()`, `getJoin()`, `insert()`, `update()`, `delete()`, `query()`, `sql\`\``, `first()`, `all()`, `paginate()`, `count()`, `transaction()`

## Without a Controller

```ts
import { DbClient } from 'bunigniter'

const db = new DbClient({
  dialect: 'postgres',
  connection: { host: '...', database: 'analytics' },
})
await db.open()

const result = await db.get('users')
```

## Example: Read Replica

```ts
export default {
  db: {
    dialect: 'postgres',
    connection: { host: 'primary.example.com', database: 'app' },
  },
  databases: {
    readonly: {
      dialect: 'postgres',
      connection: { host: 'replica.example.com', database: 'app' },
    },
  },
}
```

```ts
class Reports extends Controller {
  async index() {
    // Writes go to primary
    await this.db.insert('audit_logs', { action: 'view_reports' })

    // Heavy reads go to replica
    const data = await this.dbs.readonly.getJoin('orders o', [
      ['users u', 'u.id = o.user_id'],
    ], { limit: 100, orderBy: 'o.created_at DESC' })

    return this.json(data)
  }
}
```
