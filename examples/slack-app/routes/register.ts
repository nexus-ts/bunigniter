import { Controller } from "bunigniter";

export class Register extends Controller {
	async index() {
		if (this.auth.check()) return this.redirect("/channels");
		const error = (this.ctx.query?.error as string) ?? "";
		return this.view("register", { title: "Create Account", error });
	}

	async create() {
		const data = this.request.only([
			"username",
			"display_name",
			"email",
			"password",
		]);
		const ip = this.request.ip() ?? "unknown";

		if (
			!this.request.has("username") ||
			!this.request.has("email") ||
			!this.request.has("password")
		) {
			return this.redirect("/register?error=All fields required");
		}

		if (!data.email || !data.email.includes("@")) {
			return this.redirect("/register?error=Valid email required");
		}

		const existing = await this.db.first(
			"SELECT id FROM users WHERE username = ? OR email = ?",
			[data.username, data.email],
		);
		if (existing)
			return this.redirect("/register?error=Username or email taken");

		const hash = await crypto.subtle.digest(
			"SHA-256",
			new TextEncoder().encode(data.password),
		);
		const pwHash = Array.from(new Uint8Array(hash))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");

		const userId = await this.db.insert("users", {
			username: data.username,
			display_name: data.display_name || data.username,
			email: data.email,
			password: pwHash,
		});

		const user = await this.db.first("SELECT * FROM users WHERE id = ?", [
			userId,
		]);
		this.auth.login(user);
		return this.redirect("/channels");
	}
}
