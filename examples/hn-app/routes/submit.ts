/**
 * Submit — post a new story.
 *
 * GET  /submit → show form
 * POST /submit → create story
 */
import { Controller } from "bunigniter";

export class Submit extends Controller {
	async index() {
		const user = this.auth.user();
		if (!user) return this.redirect("/login");
		return this.view("submit", { title: "Submit", user, flash: null });
	}

	async create() {
		const user = this.auth.user();
		if (!user) return this.redirect("/login");

		const v = this.validate(this.body, { title: "required|min:2" });
		if (v.fails()) {
			return this.view("submit", {
				title: "Submit",
				user,
				flash: "Title is required",
			});
		}

		const title = v.data.title;
		const url = this.request.post("url", "").trim();
		const text = this.request.post("text", "").trim();

		if (!url && !text) {
			return this.view("submit", {
				title: "Submit",
				user,
				flash: "Provide url or text",
			});
		}

		await this.db.query(
			"INSERT INTO stories (title, url, text, user_id) VALUES (?, ?, ?, ?)",
			[title, url || null, text || null, user.id],
		);

		return this.redirect("/");
	}
}
