import { Controller } from "bunigniter";

export class Login extends Controller {
	async index() {
		if (this.auth.check()) return this.redirect("/channels");

		const error = (this.ctx.query?.error as string) ?? "";
		return this.view("login", { title: "Sign In", error });
	}

	async create() {
		if (this.request.method() !== "POST") return this.redirect("/login");

		const username = this.request.input("username", "");
		const password = this.request.input("password", "");

		if (!this.request.filled("username") || !this.request.filled("password")) {
			return this.redirect("/login?error=Username and password required");
		}

		const user = await this.db.first("SELECT * FROM users WHERE username = ?", [
			username,
		]);
		if (!user) return this.redirect("/login?error=Invalid credentials");

		const hash = await crypto.subtle.digest(
			"SHA-256",
			new TextEncoder().encode(password),
		);
		const pwHash = Array.from(new Uint8Array(hash))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");

		if (user.password !== pwHash) {
			return this.redirect("/login?error=Invalid credentials");
		}

		this.auth.login(user);
		return this.redirect("/channels");
	}
}
