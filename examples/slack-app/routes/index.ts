import { Controller } from "bunigniter";

export class Index extends Controller {
	async index() {
		if (this.auth.check()) return this.redirect("/channels");
		return this.redirect("/login");
	}
}
