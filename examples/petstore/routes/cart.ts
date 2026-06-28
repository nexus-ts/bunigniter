/**
 * Cart — session-based shopping cart.
 *
 * GET  /cart → show cart
 * POST /cart/add/:id → add pet to cart
 * POST /cart/remove/:id → remove from cart
 */
import { Controller } from "@nexusts/core";

export class Cart extends Controller {
	async index() {
		const cart = this.session.get<number[]>("cart") ?? [];
		let items: any[] = [];
		let total = 0;

		if (cart.length > 0) {
			const placeholders = cart.map(() => "?").join(",");
			const result = await this.db.query(
				`SELECT * FROM pets WHERE id IN (${placeholders})`,
				cart,
			);
			items = result.rows;
			total = items.reduce((s: number, p: any) => s + Number(p.price), 0);
		}

		return this.view("cart", {
			title: "Shopping Cart",
			items,
			total,
			cartCount: cart.length,
		});
	}

	async create() {
		const petId = this.request.integer("pet_id");
		if (!petId) return this.redirect("/cart");
		let cart = this.session.get<number[]>("cart") ?? [];

		if (this.request.post("_action") === "remove") {
			cart = cart.filter((i: number) => i !== petId);
		} else if (!cart.includes(petId)) {
			cart.push(petId);
		}

		this.session.set("cart", cart);
		return this.redirect("/cart");
	}

	async destroy(id: number) {
		let cart = this.session.get<number[]>("cart") ?? [];
		cart = cart.filter((i: number) => i !== id);
		this.session.set("cart", cart);
		return this.redirect("/cart");
	}
}
