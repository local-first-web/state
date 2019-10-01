declare const self: Worker

let interval: any = false
let count = 0

const messageHandler = (event: any) => {
  const msg = event.data
  if (interval) clearInterval(interval)
  switch (msg) {
    case 'start':
      interval = setInterval(() => {
        self.postMessage(count++)
      })
      break
    case 'stop':
      count = 0
      self.postMessage(count)
      break
    default:
      break
  }
}

self.addEventListener('message', messageHandler)

export default {} as typeof Worker & { new (): Worker }
