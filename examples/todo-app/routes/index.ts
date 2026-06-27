/**
 * Home — redirects to the todo list.
 */
import { Controller } from '../../../src/base/index'

export class Home extends Controller {
	async index() {
		return this.redirect('/todos')
	}
}
