import { Controller } from "bunigniter";

export class Channels extends Controller {
	protected _before(): Response | undefined {
		if (!this.auth.check()) return this.redirect("/login");
	}

	async index() {
		const user = this.auth.user();
		const result = await this.db.sql`
      SELECT c.*, (SELECT count(*) FROM messages m WHERE m.channel_id = c.id) as msg_count,
        (SELECT username FROM users WHERE id = c.created_by) as creator_name
      FROM channels c
      JOIN channel_members cm ON cm.channel_id = c.id AND cm.user_id = ${user.id}
      ORDER BY c.name
    `;
		const channels = result.rows;

		return this.view("channels", { title: "Channels", channels, user });
	}
}
