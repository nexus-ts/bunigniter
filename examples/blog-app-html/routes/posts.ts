import { Controller } from '@nexusts/core'

export class Posts extends Controller {
  async index() {
    const result = await this.db.query("SELECT p.*, u.username FROM posts p JOIN users u ON u.id = p.user_id WHERE p.published = 1 ORDER BY p.created_at DESC LIMIT 20")
    const user = this.auth.check() ? this.auth.user() : null
    return this.view('posts/index', { title: 'Blog', posts: result.rows, user })
  }
  async show(id: number) {
    const post = await this.db.first("SELECT p.*, u.username FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?", [id])
    if (!post) return this.notFound('Post not found')
    const comments = await this.db.query("SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC", [id])
    const user = this.auth.check() ? this.auth.user() : null
    return this.view('posts/show', { title: post.title, post, comments: comments.rows, user })
  }
}
