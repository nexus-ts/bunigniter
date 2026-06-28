/**
 * Service — CodeIgniter-style service class.
 *
 * Extend this to get `this.db` for database access.
 *
 * @example
 * ```ts
 * // services/user.service.ts
 * export class UserService extends Service {
 *   async findById(id: number) {
 *     return this.db.query('SELECT * FROM users WHERE id = ?', [id])
 *   }
 * }
 * ```
 */
import type { DbClient } from "../db/drizzle"

export class Service {
	/** Database client. */
	declare db: DbClient
}
