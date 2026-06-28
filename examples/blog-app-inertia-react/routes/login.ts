import { Controller } from 'bunigniter'
export class Login extends Controller {
  async index() {
    if (this.auth.check()) return this.redirect('/admin')
    return this.page('Auth/Login', { title: 'Login', user: null })
  }
  async create() {
    const v = this.validate(this.body, { username: 'required', password: 'required' })
    if (v.fails()) return this.page('Auth/Login', { title: 'Login', flash: 'Invalid input', user: null })
    const user = await this.db.first('SELECT * FROM users WHERE username = ? AND password = ?', [v.data.username, v.data.password])
    if (!user) return this.page('Auth/Login', { title: 'Login', flash: 'Invalid credentials', user: null })
    this.auth.login({ id: user.id, username: user.username, role: user.role })
    return this.redirect('/admin')
  }
}
export class Logout extends Controller { async index() { this.auth.logout(); return this.redirect('/') } }
