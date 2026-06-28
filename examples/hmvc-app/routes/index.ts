import { Controller } from '@nexusts/core'
export class Index extends Controller { async index() { return this.redirect('/admin/dashboard') } }
