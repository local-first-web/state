import A from 'automerge'
import debug from 'debug'
import { MiddlewareFactory } from './types'

const log = debug('cevitxe:middleware')

export const getMiddleware: MiddlewareFactory = <T>(
  feed: Feed<string>,
  docSet: A.DocSet<any>,
  discoveryKey?: string
) => {
  return store => next => action => {
    log('document', discoveryKey)
    // before changes
    const prevState = store.getState() || A.init()
    log('action %o', action)
    log('prevDoc %o', prevState)

    // changes
    const result = next(action)

    // after changes
    const nextState = store.getState()
    if (!action.payload.cameFromFeed && docSet) {
      log('calling docSet.set %o', nextState)
      // TODO: where does the key come from
      docSet.setDoc('', nextState)
    }
    // Write all actions to the feed for persistence
    const changes = A.getChanges(prevState, nextState)
    feed.append(JSON.stringify(changes))

    return result
  }
}
