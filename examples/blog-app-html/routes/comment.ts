import { Controller } from "bunigniter";
export class Comment extends Controller {
	async create(id: number) {
		const user = this.auth.user();
		if (!user) return this.redirect("/login");
		const post = await this.db.first("SELECT id FROM posts WHERE id = ?", [id]);
		if (!post) return this.notFound();
		await this.db.query(
			"INSERT INTO comments (post_id, author, content) VALUES (?,?,?)",
			[id, user.username, this.request.post("content", "")],
		);
		return this.redirect("/posts/" + id);
	}
}
