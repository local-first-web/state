import automerge from 'automerge'
import { INITIALIZE } from './constants'

// Builds a new automerge object from the object provided
export const automergify = <T>(obj: T) =>
  automerge.change(automerge.init<T>(), INITIALIZE, (d: T) => {
    for (const k in obj) d[k] = obj[k]
  })
