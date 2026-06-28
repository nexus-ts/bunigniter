import { Controller } from '@nexusts/core'

export class Admin extends Controller {
  protected _before(): Response | undefined {
    const user = this.auth.user()
    if (!user) return this.redirect('/login')
    return undefined
  }

  async index() {
    const posts = await this.db.query("SELECT p.*, u.username FROM posts p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC")
    return this.view('admin', { title: 'Admin', posts: posts.rows, user: this.auth.user() })
  }
  async show(id: number) {
    const post = id === 0 ? null : await this.db.first('SELECT * FROM posts WHERE id = ?', [id])
    return this.view('edit', { title: post ? 'Edit Post' : 'New Post', post, user: this.auth.user() })
  }
  async create() {
    const v = this.validate(this.body, { title: 'required' })
    if (v.fails()) return this.redirect('/admin')
    const slug = this.body?.slug || v.data.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
    const user = this.auth.user()!
    await this.db.query("INSERT INTO posts (title, slug, content, excerpt, user_id) VALUES (?,?,?,?,?)", [v.data.title, slug, this.body?.content || '', this.body?.excerpt || '', user.id])
    return this.redirect('/admin')
  }
  async update(id: number) {
    await this.db.query("UPDATE posts SET title=?, slug=?, content=?, excerpt=? WHERE id=?", [this.body?.title, this.body?.slug, this.body?.content || '', this.body?.excerpt || '', id])
    return this.redirect('/admin')
  }
}
