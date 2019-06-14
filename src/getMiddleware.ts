import { MiddlewareFactory } from './types'
import automerge from 'automerge'

export const getMiddleware: MiddlewareFactory = feed => store => next => action => {
  const prevState = store.getState()
  const result = next(action)
  // Don't re-write items to the feed
  if (action.payload.fromCevitxe) {
    return result
  }
  const nextState = store.getState()
  const existingState = prevState ? prevState : automerge.init()
  const changes = automerge.getChanges(existingState, nextState)
  changes.forEach(c => feed.append(JSON.stringify(c)))
  return result
}
