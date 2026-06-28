import { Controller } from "bunigniter";
import { join } from "node:path";

export class Profile extends Controller {
	protected _before(): Response | undefined {
		if (!this.auth.check()) return this.redirect("/login");
	}

	async index() {
		return this.view("profile", { title: "Profile", user: this.auth.user() });
	}

	async update() {
		const user = this.auth.user();
		const displayName = this.request.post("display_name", "").trim();
		if (displayName) {
			await this.db.update(
				"users",
				{ display_name: displayName },
				{ id: user.id },
			);
		}

		const hasAvatar = this.upload.hasFile("avatar");
		if (hasAvatar) {
			const file = await this.upload.file("avatar");
			if (file && !file._errors) {
				const filePath = await this.upload.store(file, "avatars");
				// Resize avatar to thumbnail
				const absPath = join(process.cwd(), "storage", filePath);
				const thumbPath = absPath.replace(/(\.\w+)$/, "_thumb$1");
				try {
					await this.imageOpen(absPath)
						.resize(100, 100, { mode: "cover" })
						.save(thumbPath);
					await this.db.update("users", { avatar: filePath }, { id: user.id });
				} catch (e) {
					console.log("[slack] avatar resize failed:", e);
				}
			}
		}

		return this.redirect("/profile");
	}
}
