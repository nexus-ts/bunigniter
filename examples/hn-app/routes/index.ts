/**
 * Index — top stories (front page).
 *
 * GET / → top stories
 * GET /new → newest stories
 */
import { Controller } from "bunigniter";

function timeago(dateStr: string): string {
	const d = new Date(dateStr + "Z");
	const diff = (Date.now() - d.getTime()) / 1000;
	if (diff < 60) return "just now";
	if (diff < 3600) return Math.floor(diff / 60) + " minutes ago";
	if (diff < 86400) return Math.floor(diff / 3600) + " hours ago";
	return Math.floor(diff / 86400) + " days ago";
}

interface Story {
	id: number;
	title: string;
	url: string | null;
	text: string | null;
	user_id: number;
	username: string;
	points: number;
	comment_count: number;
	created_at: string;
}

export class Index extends Controller {
	async index() {
		const sort = this.request.get("sort", "top");
		const orderBy = sort === "new" ? "s.created_at DESC" : "s.points DESC";

		const result = await this.db.query<Story>(`
			SELECT s.*, u.username,
				(SELECT count(*) FROM comments c WHERE c.story_id = s.id) as comment_count
			FROM stories s JOIN users u ON u.id = s.user_id
			ORDER BY ${orderBy} LIMIT 30
		`);

		const user = this.auth.check() ? this.auth.user() : null;

		const stories = result.rows.map((s) => ({
			...s,
			timeAgo: timeago(s.created_at),
			host: s.url ? new URL(s.url).hostname.replace("www.", "") : null,
		}));

		return this.view("home", {
			title: sort === "new" ? "New Stories" : "Hacker News",
			stories,
			user,
			sort,
			timeAgo: (d: string) => timeago(d),
		});
	}
}
