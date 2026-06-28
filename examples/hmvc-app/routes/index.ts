import { Controller } from 'bunigniter'
export class Index extends Controller { async index() { return this.redirect('/admin/dashboard') } }
