/**
 * Home — redirects to the todo list.
 */
import { Controller } from '@nexusts/core'

export class Home extends Controller {
	async index() {
		return this.redirect('/todos')
	}
}
