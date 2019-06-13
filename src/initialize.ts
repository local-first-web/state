import automerge from 'automerge'

// Builds a new automerge object from the object provided
export const initialize = <T>(obj: T) =>
  automerge.change(automerge.init<T>(), 'initialize', (d: T) => {
    for (const k in obj) {
      d[k] = obj[k]
    }
  })
