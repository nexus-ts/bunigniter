import { Controller } from 'bunigniter'
export class Products extends Controller {
  async index() {
    const products = await this.db.get('products', null, { orderBy: 'name ASC' })
    return this.view('products', { title: 'Shop', products })
  }
  async show(id: number) {
    const product = await this.db.first('SELECT * FROM products WHERE id = ?', [id])
    if (!product) return this.notFound()
    return this.view('product', { title: product.name, product })
  }
}
