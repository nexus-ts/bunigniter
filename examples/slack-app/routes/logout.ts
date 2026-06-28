import { Controller } from "bunigniter";

export class Logout extends Controller {
	async create() {
		this.auth.logout();
		return this.redirect("/login");
	}
}
