# Database — CI-style Query Builder

Available on `this.db` in controllers.

## Basic CRUD

```ts
db.insert('users', { name: 'Alice', email: 'a@b.com' })
db.update('users', { name: 'Bob' }, { id: 1 })
db.delete('users', { id: 1 })
db.get('users', { role: 'admin' })
db.get('users')  // all
```

## JOIN

```ts
db.getJoin('posts p', [['users u', 'u.id = p.user_id']])
db.getJoin('orders o', [
  ['users u', 'u.id = o.user_id'],
  ['items i', 'i.order_id = o.id', 'left'],
], { where: { 'o.status': 'paid' }, orderBy: 'o.created_at DESC', limit: 10 })
```

## WHERE Operators

```ts
{ age: ['>=', 18] }           // age >= 18
{ name: ['LIKE', '%alice%'] } // name LIKE '%alice%'
{ role: ['IN', ['a','b']] }   // role IN ('a','b')
{ age: ['>', 10], status: 'active' }  // AND
```

## Options

```ts
db.get('posts', null, { select: 'id, title', orderBy: 'created_at DESC', limit: 5, offset: 10 })
db.get('items', null, { groupBy: 'category', having: { count: ['>=', 2] } })
```

## Other

```ts
db.paginate('SELECT * FROM users', [], { page: 2, perPage: 20 })
db.count('users', { role: 'admin' })
db.first('SELECT * FROM users WHERE id = ?', [1])
db.sql\`SELECT * FROM users WHERE id = ${id}\`
db.transaction(async tx => { ... })
```

## Multi-Database

```ts
// config/app.ts — databases: { analytics: { dialect: 'postgres', ... } }
this.dbs.analytics.get('pageviews')
```
