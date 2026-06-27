/**
 * About page controller — renders the MDX About view.
 *
 * GET /about → renders views/About.mdx
 */
import { Controller } from '../../../src/base/index'

export class About extends Controller {
	async index() {
		return this.view('About', {}, { title: 'About Todo App' })
	}
}
