import { MiddlewareFactory } from './types'
import automerge from 'automerge'

export const getMiddleware: MiddlewareFactory = feed => store => next => action => {
  // before changes
  const prevState = store.getState() || automerge.init()

  // changes
  const result = next(action)

  // after changes
  const nextState = store.getState()

  // write actions to feed (if they're not already coming from the feed)
  if (!action.payload.cameFromFeed) {
    const changes = automerge.getChanges(prevState, nextState)
    changes.forEach(change => feed.append(JSON.stringify(change)))
  }
  return result
}
