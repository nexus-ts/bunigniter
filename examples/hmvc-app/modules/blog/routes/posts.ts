import { Controller } from '@nexusts/core'
export class Posts extends Controller {
  async index() {
    const posts = await this.db.get('posts', null, { orderBy: 'created_at DESC' })
    return this.view('posts', { title: 'Blog', posts })
  }
  async show(id: number) {
    const post = await this.db.first('SELECT * FROM posts WHERE id = ?', [id])
    if (!post) return this.notFound()
    const posts = await this.db.get('posts', null, { orderBy: 'created_at DESC' })
    return this.view('post', { title: post.title, post, posts })
  }
}
