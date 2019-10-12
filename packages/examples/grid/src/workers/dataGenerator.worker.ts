import { randomRow } from './randomRow'

declare const self: Worker

self.addEventListener('message', async e => {
  const collection = [] as any[]
  const rows = +e.data
  for (let i = 0; i < rows; i++) {
    const item = randomRow()
    collection.push(item)
    if (Number.isInteger((i / rows) * 100)) self.postMessage({ progress: i })
  }
  self.postMessage({ result: collection })
})

export default {} as typeof Worker & { new (): Worker }
