import { Controller } from 'bunigniter'

export class Posts extends Controller {
  async index() {
    const posts = await this.db.getJoin('posts p', [['users u', 'u.id = p.user_id']], {
      where: { 'p.published': 1 },
      orderBy: 'p.created_at DESC',
      limit: 20,
    })
    const user = this.auth.check() ? this.auth.user() : null
    return this.view('posts/index', { title: 'Blog', posts, user })
  }

  async show(id: number) {
    const post = await this.db.getJoin('posts p', [['users u', 'u.id = p.user_id']], {
      where: { 'p.id': id },
    })
    if (!post.length) return this.notFound('Post not found')
    const comments = await this.db.query('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC', [id])
    const user = this.auth.check() ? this.auth.user() : null
    return this.view('posts/show', { title: post[0].title, post: post[0], comments: comments.rows, user })
  }
}
