/**
 * Home — redirects to the todo list.
 */
import { Controller } from 'bunigniter'

export class Home extends Controller {
	async index() {
		return this.redirect('/todos')
	}
}
