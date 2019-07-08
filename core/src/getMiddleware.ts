import A from 'automerge'
import debug from 'debug-deluxe'
import { MiddlewareFactory } from './types'

const log = debug('cevitxe:middleware')

export const getMiddleware: MiddlewareFactory = (feed, docSet) => store => next => action => {
  // before changes
  const prevState = store.getState() || A.init()
  log('action', action)
  log('prevDoc', prevState)

  // changes
  const result = next(action)

  // after changes
  const nextState = store.getState()
  if (!action.payload.cameFromFeed && docSet) {
    log('calling setDoc', nextState)
    docSet.set(nextState)
  }
  // Write all actions to the feed for persistence
  const changes = A.getChanges(prevState, nextState)
  feed.append(JSON.stringify(changes))

  return result
}
