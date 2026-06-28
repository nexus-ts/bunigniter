import { Controller } from "bunigniter";

export class Messages extends Controller {
	protected _before(): Response | undefined {
		if (!this.auth.check()) return this.redirect("/login");
	}

	async create() {
		const user = this.auth.user();
		const channelId = this.request.post("channel_id");
		const content = this.request.post("content", "").trim();
		const hasFile = this.upload.hasFile("attachment");

		if (!channelId) return this.json({ error: "channel_id required" }, 400);
		if (!content && !hasFile)
			return this.json({ error: "Content or file required" }, 400);

		let filePath: string | null = null;
		let fileType: string | null = null;

		if (hasFile) {
			const file = await this.upload.file("attachment");
			if (file && file._errors) return this.json({ error: file._errors }, 400);
			if (file) {
				const ext = this.upload.extension(file);
				if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
					filePath = await this.upload.store(file, "slack-images");
					fileType = "image";
					// Create thumbnail
					try {
						const absPath = join(process.cwd(), "storage", filePath);
						const thumbPath = absPath.replace(/(\.\w+)$/, "_thumb$1");
						await this.imageOpen(absPath).resize(200).save(thumbPath);
					} catch (e) {
						console.log("[slack] thumbnail skipped:", e);
					}
				} else {
					filePath = await this.upload.store(file, "slack-files");
					fileType = "file";
				}
			}
		}

		const now = new Date().toISOString().replace("T", " ").split(".")[0];
		await this.db.insert("messages", {
			channel_id: Number(channelId),
			user_id: user.id,
			content,
			file_path: filePath,
			file_type: fileType,
			created_at: now,
		});

		if (this.request.isAjax()) {
			return this.json({ ok: true });
		}

		return this.redirect(`/channels/${channelId}`);
	}
}
