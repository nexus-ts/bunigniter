# WebSocket & SSE

## WebSocket — routes/ws.ts

```ts
import { ws } from '@nexusts/core/helpers/ws'

ws.handle('/ws/echo', {
  open(ws) { console.log('connected') },
  message(ws, data) { ws.send('echo: ' + data) },
  close(ws) { console.log('disconnected') },
})

ws.handle('/ws/chat', {
  message(ws, data) { ws.publish('chat', JSON.stringify({ msg: data })) },
})
```

Methods: `ws.send(data)`, `ws.publish(room, data)`, `ws.subscribe(room)`, `ws.unsubscribe(room)`

## SSE — routes/sse.ts

```ts
import { defineHandler } from '@nexusts/core'
import { sse } from '@nexusts/core/helpers/sse'

export const GET = defineHandler(async (ctx) => {
  return sse(ctx, (send) => {
    const timer = setInterval(() => send({ event: 'tick', data: { count: 1 } }), 1000)
    return () => clearInterval(timer)  // cleanup on disconnect
  })
})
```

Send: `{ event?, data?, id?, retry? }`
