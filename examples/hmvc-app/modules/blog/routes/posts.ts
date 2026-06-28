import { Controller } from '@nexusts/core'
import { OpenAPIRegistry } from '@nexusts/core/helpers/openapi'

OpenAPIRegistry.add('/blog/posts', 'GET', {
  summary: 'List all blog posts',
  description: 'Returns all blog posts ordered by creation date',
  tags: ['Blog'],
})

OpenAPIRegistry.add('/blog/posts/:id', 'GET', {
  summary: 'Get a blog post',
  description: 'Returns a single blog post by ID',
  tags: ['Blog'],
  parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
  responses: { '200': { description: 'Post found' }, '404': { description: 'Post not found' } },
})

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
