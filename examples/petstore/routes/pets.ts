import { Controller } from '@nexusts/core'

export class Pets extends Controller {
  async index() {
    const species = this.request.get('species', '')
    const search = this.request.get('q', '')
    const sort = this.request.get('sort', 'newest')

    let where = "WHERE status = 'available'"
    const params: unknown[] = []
    if (species && ['dog','cat','bird','rabbit'].includes(species)) { where += ' AND species = ?'; params.push(species) }
    if (search) { where += ' AND (name LIKE ? OR breed LIKE ? OR description LIKE ?)'; const s = `%${search}%`; params.push(s, s, s) }
    const order = sort === 'price_asc' ? 'price ASC' : sort === 'price_desc' ? 'price DESC' : 'created_at DESC'

    const result = await this.db.query(`SELECT * FROM pets ${where} ORDER BY ${order} LIMIT 50`, params)
    return this.view('pets/index', { title: search ? `Search: ${search}` : species ? `${species}s` : 'All Pets', pets: result.rows, species, search, sort })
  }

  async show(id: number) {
    const pet = await this.db.first('SELECT * FROM pets WHERE id = ?', [id])
    if (!pet) return this.notFound('Pet not found')
    const related = await this.db.query("SELECT * FROM pets WHERE species = ? AND id != ? AND status = 'available' LIMIT 4", [pet.species, id])
    return this.view('pets/show', { title: pet.name, pet, related: related.rows })
  }
}
