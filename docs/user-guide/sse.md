# Server-Sent Events (SSE)

SSE allows servers to push data to clients over a single HTTP connection. Unlike WebSocket, SSE is one-way (server → client) and uses standard HTTP.

## Quick Start

```ts
// routes/sse.ts
import { defineHandler } from 'bunigniter'
import { sse } from 'bunigniter/helpers/sse'

export const GET = defineHandler(async (ctx) => {
  return sse(ctx, (send) => {
    send({ event: 'time', data: { now: new Date().toISOString() } })
  })
})
```

## API

### `sse(ctx, handler)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `ctx` | Context | Elysia request context |
| `handler` | `(send) => void \| (() => void)` | Callback that receives `send()` function. Can return a cleanup function. |

### `send(message)`

| Field | Type | Description |
|-------|------|-------------|
| `event` | `string` | Event type (default: `'message'`) |
| `data` | `any` | Payload (auto JSON-stringified) |
| `id` | `string \| number` | Event ID (for `Last-Event-ID` reconnection) |
| `retry` | `number` | Reconnection time in ms |

## Examples

### Clock (periodic updates)

```ts
export const GET = defineHandler(async (ctx) => {
  return sse(ctx, (send) => {
    const timer = setInterval(() => {
      send({ event: 'tick', data: { time: new Date().toISOString() } })
    }, 1000)
    // Cleanup on client disconnect
    return () => clearInterval(timer)
  })
})
```

### Notifications (single push)

```ts
export const POST = defineHandler(async (ctx) => {
  return sse(ctx, (send) => {
    send({
      event: 'notification',
      data: { title: 'New message', body: 'You have a new notification' },
    })
  })
})
```

### Progress updates

```ts
export const GET = defineHandler(async (ctx) => {
  return sse(ctx, async (send) => {
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 200))
      send({ event: 'progress', data: { percent: i, status: `Step ${i}` } })
    }
    send({ event: 'complete', data: { message: 'All done!' } })
  })
})
```

## Client Examples

### Browser (EventSource)

```ts
const source = new EventSource('/sse')

source.addEventListener('tick', (e) => {
  const data = JSON.parse(e.data)
  console.log('Tick:', data.time)
})

source.addEventListener('notification', (e) => {
  const data = JSON.parse(e.data)
  alert(data.title + ': ' + data.body)
})

source.onerror = () => console.log('Connection lost')
```

### Browser (fetch + ReadableStream)

```ts
const res = await fetch('/sse')
const reader = res.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  console.log(decoder.decode(value))
}
```

### Fetch with timeout

```ts
const controller = new AbortController()
setTimeout(() => controller.abort(), 5000)  // 5 second stream

const res = await fetch('/sse', { signal: controller.signal })
// ... read stream ...
```

## SSE vs WebSocket

| Feature | SSE | WebSocket |
|---------|-----|-----------|
| Direction | Server → Client only | Bidirectional |
| Protocol | HTTP (standard) | WS (separate protocol) |
| Auto-reconnect | Built-in (EventSource) | Manual |
| Browser support | All modern browsers | All modern browsers |
| Use case | Notifications, feeds, logs | Chat, gaming, real-time collaboration |

## Notes

- SSE routes are registered via `export const GET = defineHandler(...)` in `routes/*.ts`
- The `sse()` function returns a `Response` with `text/event-stream` headers
- Cleanup functions are called when the client disconnects
- No external dependencies — uses built-in `ReadableStream`
