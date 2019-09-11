/* eslint-disable */
declare const self: Worker

const startCounter = (event: any) => {
  console.log({ data: event.data, self })
  let initial = event.data
  setInterval(() => self.postMessage(initial++), 100)
}

self.addEventListener('message', startCounter)

console.log('WebpackWorker wired up')
export default {} as typeof Worker & { new (): Worker }
