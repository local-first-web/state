import A from 'automerge'
import debug from 'debug'
import { MiddlewareFactory } from './types'
import { SingleDocSet } from './SingleDocSet'

const log = debug('cevitxe:middleware')

export const getMiddleware: MiddlewareFactory = <T>(
  feed: Feed<string>,
  docSet: SingleDocSet<any>
) => {
  return store => next => action => {
    // before changes
    const prevState = store.getState() || A.init()
    log('action %o', action)
    log('prevDoc %o', prevState)

    // changes
    const result = next(action)

    // after changes
    const nextState = store.getState()
    if (!action.payload.cameFromFeed && docSet) {
      log('calling setDoc %o', nextState)
      docSet.set(nextState)
    }
    // Write all actions to the feed for persistence
    const changes = A.getChanges(prevState, nextState)
    feed.append(JSON.stringify(changes))

    return result
  }
}
