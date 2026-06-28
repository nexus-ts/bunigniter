import { ws } from '../src/helpers/ws'

ws.handle('/ws/echo', {
  open(ws) { console.log('[ws] echo connected') },
  message(ws, data) { ws.send('echo: ' + data) },
  close(ws) { console.log('[ws] echo disconnected') },
})

ws.handle('/ws/chat', {
  message(ws, data) { ws.publish('chat', JSON.stringify({ msg: data })) },
})

ws.handle('/ws/counter', {
  open(ws) {
    let count = 0
    const timer = setInterval(() => {
      count++
      try { ws.send(JSON.stringify({ count, time: new Date().toISOString() })) } catch {}
      if (count >= 3) { clearInterval(timer); ws.close(); }
    }, 1000)
  },
})
