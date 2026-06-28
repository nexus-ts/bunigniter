import { defineHandler } from '../src/helpers/handler'
import { sse } from '../src/helpers/sse'

export const GET = defineHandler(async (ctx: any) => {
  return sse(ctx, (send: any) => {
    let n = 0
    const timer = setInterval(() => {
      n++
      send({ event: 'tick', data: { count: n, time: new Date().toISOString() } })
      if (n >= 5) { clearInterval(timer); send({ event: 'done', data: { message: 'Complete' } }) }
    }, 1000)
    return () => clearInterval(timer)
  })
})

export const POST = defineHandler(async (ctx: any) => {
  return sse(ctx, (send: any) => {
    send({ event: 'notify', data: { message: 'SSE notification!' } })
  })
})
