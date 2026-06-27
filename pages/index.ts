/**
 * Home page — GET /api
 */
import { Controller } from '../src/base/index'

export class Home extends Controller {
	async index() {
		return this.json({
			app: 'NexusTS',
			version: '0.1.0',
			status: 'running',
			endpoints: {
				health: '/health',
				users: '/api/users',
			}
		})
	}
}
