import { Controller } from "bunigniter";

export class Admin extends Controller {
	protected _before(): Response | undefined {
		if (!this.auth.check()) return this.redirect("/login");
	}

	async index() {
		const posts = await this.db.getJoin(
			"posts p",
			[["users u", "u.id = p.user_id"]],
			{ orderBy: "p.created_at DESC" },
		);
		return this.view("admin", {
			title: "Admin",
			posts,
			user: this.auth.user(),
		});
	}
	async show(id: number) {
		const post =
			id === 0
				? null
				: await this.db.first("SELECT * FROM posts WHERE id = ?", [id]);
		return this.view("edit", {
			title: post ? "Edit Post" : "New Post",
			post,
			user: this.auth.user(),
		});
	}
	async create() {
		const v = this.validate(this.body, { title: "required" });
		if (v.fails()) return this.redirect("/admin");
		const slug =
			this.request.post("slug") ||
			v.data.title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/(^-|-$)/g, "");
		const user = this.auth.user()!;
		await this.db.insert("posts", {
			title: v.data.title,
			slug,
			content: this.request.post("content", ""),
			excerpt: this.request.post("excerpt", ""),
			user_id: user.id,
		});
		return this.redirect("/admin");
	}
	async update(id: number) {
		await this.db.update(
			"posts",
			{
				title: this.request.post("title"),
				slug: this.request.post("slug"),
				content: this.request.post("content", ""),
				excerpt: this.request.post("excerpt", ""),
			},
			{ id },
		);
		return this.redirect("/admin");
	}
}
