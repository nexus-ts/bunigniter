import { Controller } from '@nexusts/core'
import { moduleRun } from '@nexusts/core/helpers/modules'

export class Dashboard extends Controller {
  async index() {
    // Cross-module calls — call blog and shop controllers
    const blogCtx = { ...this.ctx, db: this.db, session: this.session }
    const shopCtx = { ...this.ctx, db: this.db, session: this.session }

    const blogPosts = await moduleRun('blog/posts/index', blogCtx)
    const shopProducts = await moduleRun('shop/products/index', shopCtx)

    return this.view('dashboard', {
      title: 'Admin Dashboard',
      blogCount: blogPosts?.length ?? 0,
      productCount: shopProducts?.length ?? 0,
      dbStats: {
        products: await this.db.count('products'),
        posts: await this.db.count('posts'),
      },
    })
  }
}
