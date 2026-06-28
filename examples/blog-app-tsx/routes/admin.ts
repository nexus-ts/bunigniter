import { Controller } from '@nexusts/core'

export class Admin extends Controller {
  async index() {
    const user = this.auth.user()
    if (!user) return this.redirect('/login')
    const posts = await this.db.query("SELECT p.*, u.username FROM posts p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC")
    return this.view('Admin', { title: 'Admin', posts: posts.rows, user })
  }
  async show(id: number) {
    const user = this.auth.user()
    if (!user) return this.redirect('/login')
    const post = id === 0 ? null : await this.db.first('SELECT * FROM posts WHERE id = ?', [id])
    return this.view('PostEdit', { title: post ? 'Edit Post' : 'New Post', post, user })
  }
  async create() {
    const user = this.auth.user()
    if (!user) return this.redirect('/login')
    const v = this.validate(this.body, { title: 'required' })
    if (v.fails()) return this.redirect('/admin')
    const slug = this.body?.slug || v.data.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
    await this.db.query("INSERT INTO posts (title, slug, content, excerpt, user_id) VALUES (?,?,?,?,?)", [v.data.title, slug, this.body?.content || '', this.body?.excerpt || '', user.id])
    return this.redirect('/admin')
  }
  async update(id: number) {
    const user = this.auth.user()
    if (!user) return this.redirect('/login')
    await this.db.query("UPDATE posts SET title=?, slug=?, content=?, excerpt=? WHERE id=?", [this.body?.title, this.body?.slug, this.body?.content || '', this.body?.excerpt || '', id])
    return this.redirect('/admin')
  }
}
