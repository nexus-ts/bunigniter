import { Controller } from "bunigniter";

export class Channel extends Controller {
	protected _before(): Response | undefined {
		if (!this.auth.check()) return this.redirect("/login");
	}

	async show(id: number) {
		const user = this.auth.user();
		const channel = await this.db.first("SELECT * FROM channels WHERE id = ?", [
			id,
		]);
		if (!channel) return this.notFound();

		const msgResult = await this.db.sql`
      SELECT m.*, u.username, u.display_name, u.avatar
      FROM messages m
      JOIN users u ON u.id = m.user_id
      WHERE m.channel_id = ${id}
      ORDER BY m.created_at ASC LIMIT 100
    `;
		const messages = msgResult.rows;

		const chResult = await this.db.sql`
      SELECT c.* FROM channels c
      JOIN channel_members cm ON cm.channel_id = c.id AND cm.user_id = ${user.id}
      ORDER BY c.name
    `;
		const channels = chResult.rows;

		if (this.request.isAjax()) {
			return this.json({ channel, messages, user, channels });
		}

		return this.view("channel", {
			title: `#${channel.name}`,
			channel,
			messages,
			user,
			channels,
		});
	}
}
