# Database Query Builder

NexusTS provides a CodeIgniter-style query builder through `DbClient`. All methods are SQL-injection safe (parameterized queries).

## Configuration

```ts
// config/app.ts
export default {
  db: {
    dialect: 'bun-sqlite', // postgres | mysql | sqlite | bun-sqlite | d1
    connection: {
      filename: 'app.db',                 // SQLite
      // host: 'localhost', port: 5432,   // PostgreSQL / MySQL
      // user: 'postgres', password: '', database: 'myapp'
    },
  },
}
```

## Basic CRUD

### Insert a record

```ts
await db.insert('users', {
  name: 'Alice',
  email: 'alice@example.com',
  role: 'admin'
})
// INSERT INTO users (name, email, role) VALUES (?, ?, ?)
```

### Batch insert

```ts
await db.insertBatch('users', [
  { name: 'Alice', email: 'alice@test.com' },
  { name: 'Bob', email: 'bob@test.com' },
  { name: 'Charlie', email: 'charlie@test.com' },
])
// INSERT INTO users (name, email) VALUES (?, ?),(?, ?),(?, ?)
```

### Update records

```ts
await db.update('users', { name: 'Bob', role: 'editor' }, { id: 1 })
// UPDATE users SET name = ?, role = ? WHERE id = ?
```

### Delete records

```ts
await db.delete('users', { id: 1 })
// DELETE FROM users WHERE id = ?

await db.delete('logs', { created_at: ['<', '2024-01-01'] })
// DELETE FROM logs WHERE created_at < ?
```

### Truncate table

```ts
await db.truncate('sessions')
// DELETE FROM sessions
```

## Reading Data

### Get all records

```ts
const users = await db.get('users')
// SELECT * FROM users
```

### Get with WHERE

```ts
const admins = await db.get('users', { role: 'admin' })
// SELECT * FROM users WHERE role = ?

const recent = await db.get('posts', {
  status: 'published',
  views: ['>=', 100],
})
// SELECT * FROM posts WHERE status = ? AND views >= ?
```

### Get with ordering and limit

```ts
const top = await db.get('posts', { status: 'published' }, {
  orderBy: 'created_at DESC',
  limit: 10,
  offset: 0,
})
```

### Get with JOIN

```ts
const posts = await db.getJoin('posts p', [
  ['users u', 'u.id = p.user_id'],
])
// SELECT * FROM posts p JOIN users u ON u.id = p.user_id

// With LEFT JOIN + options
const stats = await db.getJoin('posts p', [
  ['users u', 'u.id = p.user_id'],
  ['comments c', 'c.post_id = p.id', 'left'],
], {
  select: 'p.*, u.username, count(c.id) as comments',
  where: { 'p.published': 1 },
  groupBy: 'p.id',
  having: { comments: ['>=', 1] },
  orderBy: 'comments DESC',
  limit: 5,
})
```

### Get first row

```ts
const user = await db.first('SELECT * FROM users WHERE id = ?', [1])
// Returns single row or null
```

### Get all rows (raw SQL)

```ts
const rows = await db.all('SELECT * FROM users WHERE role = ?', ['admin'])
// Returns array of rows
```

### Count records

```ts
const total = await db.count('users')
// → 42 (number)

const admins = await db.count('users', { role: 'admin' })
// → 5
```

### Tagged template SQL

```ts
const posts = await db.sql`
  SELECT p.*, u.username
  FROM posts p
  JOIN users u ON u.id = p.user_id
  WHERE p.status = ${status}
  ORDER BY p.created_at DESC
  LIMIT ${limit}
`
// Parameters are inline — cleaner than ? placeholders
```

### Raw SQL query

```ts
const result = await db.query('SELECT * FROM users WHERE role = ?', ['admin'])
// result.rows → array of rows
// result.affectedRows → number
// result.insertId → number | undefined
```

## Pagination

```ts
const result = await db.paginate(
  'SELECT * FROM posts ORDER BY created_at DESC',
  [],
  { page: 2, perPage: 20 }
)
// Returns: { data: Post[], total: 45, page: 2, perPage: 20, pages: 3 }
```

| Field | Description |
|-------|-------------|
| `data` | Page items |
| `total` | Total items across all pages |
| `page` | Current page number |
| `perPage` | Items per page |
| `pages` | Total number of pages |

Works with WHERE and JOIN:

```ts
const result = await db.paginate(
  'SELECT * FROM posts WHERE status = ? ORDER BY created_at DESC',
  ['published'],
  { page: 1, perPage: 10 }
)
```

## Transactions

```ts
const result = await db.transaction(async (tx) => {
  await tx.insert('orders', { user_id: 1, total: 99.99 })
  await tx.insert('order_items', { order_id: 1, product: 'Widget' })
  return 'success'
})
// Auto-commit on success, auto-rollback on error
```

## WHERE Operators

| Operator | Usage | Generates |
|----------|-------|-----------|
| Equals (default) | `{ role: 'admin' }` | `role = ?` |
| Greater than | `{ age: ['>', 18] }` | `age > ?` |
| Greater or equal | `{ age: ['>=', 18] }` | `age >= ?` |
| Less than | `{ price: ['<', 100] }` | `price < ?` |
| Less or equal | `{ price: ['<=', 50] }` | `price <= ?` |
| Not equal | `{ role: ['<>', 'banned'] }` | `role <> ?` |
| LIKE | `{ name: ['LIKE', '%alice%'] }` | `name LIKE ?` |
| IN | `{ role: ['IN', ['admin','editor']] }` | `role IN (?, ?)` |

## `get()` Options

```ts
await db.get('table', where, {
  select: 'id, name, email',     // Custom columns (default: *)
  orderBy: 'created_at DESC',    // ORDER BY clause
  limit: 10,                     // LIMIT
  offset: 0,                     // OFFSET
  groupBy: 'category',           // GROUP BY
  having: { count: ['>=', 2] }, // HAVING (with operators)
})
```

## `getJoin()` Options

Same as `get()`, plus:

```ts
await db.getJoin('posts p', [
  ['users u', 'u.id = p.user_id'],            // INNER JOIN (default)
  ['comments c', 'c.post_id = p.id', 'left'],  // LEFT JOIN
  ['votes v', 'v.post_id = p.id', 'right'],    // RIGHT JOIN
], {
  select: 'p.*, count(c.id) as comments',
  where: { 'p.published': 1 },
  groupBy: 'p.id',
  having: { comments: ['>=', 1] },
  orderBy: 'comments DESC',
  limit: 10,
})
```

## Dialect Support

| Feature | SQLite | PostgreSQL | MySQL | D1 |
|---------|--------|-----------|-------|-----|
| All CRUD | ✅ | ✅ | ✅ | ✅ |
| JOIN | ✅ | ✅ | ✅ | ✅ |
| LIMIT/OFFSET | ✅ | ✅ | ✅ | ✅ |
| GROUP BY/HAVING | ✅ | ✅ | ✅ | ✅ |
| Transactions | ✅ | ✅ | ✅ | ✅ |
| RETURNING | ❌ | ✅ | ❌ | ❌ |

> RETURNING is only supported in PostgreSQL. On SQLite/MySQL, use `insertId` from the result.
