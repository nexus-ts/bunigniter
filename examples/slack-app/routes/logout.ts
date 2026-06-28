import { Controller } from "bunigniter";

export class Logout extends Controller {
	async index() {
		this.auth.logout();
		return this.redirect("/login");
	}

	async create() {
		this.auth.logout();
		return this.redirect("/login");
	}
}
