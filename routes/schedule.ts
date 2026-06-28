import { schedule } from '../src/helpers/schedule'

// Log every 10 seconds
schedule.every(10000, 'health-check').do(async () => {
  console.log('[schedule] Health check OK:', new Date().toLocaleTimeString())
})

// Count up every 5 seconds
let count = 0
schedule.every(5000, 'counter').do(async () => {
  count++
  console.log(`[schedule] Counter: ${count}`)
  if (count >= 5) {
    console.log('[schedule] Stopping counter')
    schedule.stop('counter')
  }
})

console.log('[schedule] Tasks registered:', schedule.list().length)
