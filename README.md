# NexusTS

**Bun-native fullstack framework — CodeIgniter spirit × Elysia v2 performance × Edge-ready**

```bash
bun install
bun run db/seed.ts    # 샘플 데이터 생성
bun run src/index.ts  # 서버 시작 (localhost:3000)
```

## 철학

PHP(CodeIgniter)에서 TypeScript(Bun)로 넘어오는 개발자를 위해 만들었습니다.

```ts
// pages/users.ts — 파일 경로 = URL (/api/users)
export class Users extends Controller {
  async index() {                            // GET  /api/users
    const users = await this.db.query('SELECT * FROM users')
    return this.json(users)
  }

  async show(id: number) {                   // GET  /api/users/:id
    return this.json(await this.db.first('SELECT * FROM users WHERE id = ?', [id]))
  }

  async create() {                           // POST /api/users
    const result = await this.db.query('INSERT INTO users ... RETURNING *', [this.body.name])
    return this.json(result.rows[0], 201)
  }
}
```

## 특징

| 특징 | 설명 |
|---|---|
| **파일 경로 = URL** | `pages/users.ts` → `/api/users`, `pages/users/[id].ts` → `/api/users/:id` |
| **Controller / Service** | `extends Controller` → `this.db`, `this.json()`, `this.body` 등 내장 |
| **Raw SQL** | `this.db.query('SELECT * FROM users WHERE id = ?', [id])` — CodeIgniter 스타일 |
| **Drizzle ORM** | `this.db.select().from(users).all()` — 타입 안전 쿼리도 가능 |
| **ACID Transaction** | `this.db.transaction(async (tx) => { ... })` |
| **Edge Ready** | Elysia v2 (CF Workers, Deno, Node 지원) |
| **멀티 DB** | PostgreSQL, MySQL, SQLite, Cloudflare D1 |

## 빠른 시작

```bash
# 설정
config/app.ts 에서 DB 설정

# 실행
bun run src/index.ts

# API 테스트
curl http://localhost:3000/health
curl http://localhost:3000/api/users
curl http://localhost:3000/api/users/1
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com"}'
```

## 라이선스

MIT
