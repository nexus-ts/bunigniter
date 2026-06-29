# WebSocket

Bunigniter provides WebSocket support via `ws.handle()` for real-time, bidirectional communication.

## Quick Start

```ts
// routes/ws.ts
import { ws } from 'bunigniter/services/ws'

ws.handle('/ws/echo', {
  message(ws, data) {
    ws.send('echo: ' + data)
  },
})
```

Client-side:

```ts
const ws = new WebSocket('ws://localhost:3000/ws/echo')
ws.onopen = () => ws.send('Hello!')
ws.onmessage = (e) => console.log(e.data)  // "echo: Hello!"
```

## API

### `ws.handle(path, handlers, options?)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | `string` | WebSocket endpoint (e.g. `'/ws/chat'`) |
| `handlers.open` | `(ws) => void` | Called when a client connects |
| `handlers.message` | `(ws, data) => void` | Called when a message is received |
| `handlers.close` | `(ws) => void` | Called when a client disconnects |
| `handlers.drain` | `(ws) => void` | Called when the buffer is drained |
| `options.body` | Schema | Incoming message validation schema |
| `options.response` | Schema | Outgoing message validation schema |

### `ws.send(data)`

Send a message to a single client:

```ts
ws.send('Hello!')
ws.send(JSON.stringify({ type: 'notification', body: 'New post' }))
```

### `ws.publish(room, data)`

Broadcast to all clients in a room:

```ts
// In a chat handler
ws.publish('chat', JSON.stringify({
  user: 'Alice',
  message: 'Hello everyone!'
}))
```

### `ws.subscribe(room)` / `ws.unsubscribe(room)`

Join or leave a room:

```ts
ws.subscribe('room-general')
ws.subscribe('room-' + user.id)  // private room

// Later
ws.unsubscribe('room-general')
```

## Examples

### Echo Server

```ts
ws.handle('/ws/echo', {
  message(ws, data) {
    ws.send('echo: ' + data)
  },
})
```

### Chat Room

```ts
const online = new Set()

ws.handle('/ws/chat', {
  open(ws) {
    online.add(ws)
    broadcast('chat', { type: 'online', count: online.size })
  },
  message(ws, data) {
    // Broadcast to ALL connected clients
    broadcast('chat', { user: ws.id, message: data })
  },
  close(ws) {
    online.delete(ws)
    broadcast('chat', { type: 'online', count: online.size })
  },
})

function broadcast(room: string, data: any) {
  // ws.publish sends to all clients subscribed to the room
  // For global broadcast, iterate over clients
}
```

### Counter (Periodic Updates)

```ts
ws.handle('/ws/counter', {
  open(ws) {
    let count = 0
    const timer = setInterval(() => {
      count++
      ws.send(JSON.stringify({ count, time: new Date().toISOString() }))
      if (count >= 5) { clearInterval(timer); ws.close() }
    }, 1000)
  },
})
```

### Authenticated WebSocket

```ts
import { jwt } from 'bunigniter/helpers/jwt'

ws.handle('/ws/private', {
  message(ws, data) {
    // First message should be a JWT token for auth
    try {
      const payload = jwt.verify(data)
      ws.send('Authenticated as user ' + payload.userId)
    } catch {
      ws.send('Auth failed')
      ws.close()
    }
  },
})
```

## Client Examples

### Browser

```ts
const ws = new WebSocket('ws://localhost:3000/ws/chat')

ws.onopen = () => {
  console.log('Connected')
  ws.send('Hello from browser!')
}

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  console.log('Received:', msg)
}

ws.onclose = () => console.log('Disconnected')

// Send on button click
document.querySelector('#send').onclick = () => {
  ws.send(input.value)
}
```

### Bun/Node

```ts
const ws = new WebSocket('ws://localhost:3000/ws/echo')

ws.onopen = () => ws.send('Ping')

ws.onmessage = (e) => {
  console.log('Response:', e.data)
  ws.close()
}
```

## How It Works

1. Routes in `routes/ws.ts` call `ws.handle()` at import time (module load)
2. `src/index.ts` calls `ws.mount(app)` which registers each path with Elysia's `.ws()` 
3. Elysia v2's Bun adapter handles the WebSocket upgrade and message routing
4. The `ws` object in handlers is an `ElysiaWS` instance with `send`, `publish`, `subscribe`, etc.

## Notes

- WebSocket routes do NOT appear in OpenAPI specs (they're not HTTP)
- All WebSocket handlers are registered in `routes/ws.ts` by convention
- File-router imports `ws.ts` even without a Controller export (side-effect import)
- Elysia v2 WS works on Bun natively; Node.js requires the `ws` package
