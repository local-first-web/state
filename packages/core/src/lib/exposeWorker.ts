export const exposeWorker = (fn: Function) => {
  onmessage = async e => {
    let result: any
    try {
      result = fn(e.data)
      // support async iterators
      if (result[Symbol.asyncIterator]) for await (const i of result) postMessage(i)
      // support regular iterators
      else if (result[Symbol.iterator]) for (const i of result) postMessage(i)
      // support async or regular values
      else postMessage(await result)
    } catch (e) {
      postMessage({ error: e.message })
    }
  }
}
