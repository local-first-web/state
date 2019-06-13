import Automerge from 'automerge'

// Builds a new automerge object from the object provided
export const initialize = <T>(obj: T) =>
  Automerge.change(Automerge.init<T>(), 'initialize', (d: T) => {
    for (const k in obj) {
      d[k] = obj[k]
    }
  })
