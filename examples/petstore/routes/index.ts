import { Controller } from 'bunigniter'

export class Home extends Controller {
  async index() {
    const featured = await this.db.query(
      "SELECT * FROM pets WHERE status = 'available' ORDER BY price DESC LIMIT 6"
    )
    const dogs = featured.rows.filter((p:any) => p.species === 'dog').length
    const cats = featured.rows.filter((p:any) => p.species === 'cat').length
    return this.view('home', {
      title: 'Pet Store',
      pets: featured.rows,
      speciesCounts: { dogs, cats, birds: featured.rows.filter((p:any) => p.species === 'bird').length, other: featured.rows.filter((p:any) => !['dog','cat','bird'].includes(p.species)).length },
    })
  }
}
