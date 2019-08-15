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
    // before changes
    const prevState = store.getState() || A.init()

    // changes
    const result = next(action)

    // after changes
    const nextState = store.getState()
    log('%o', {
      discoveryKey,
      type: action.type,
      message: action.payload.message,
      prevState,
      nextState,
    })
    // Middleware shouldn't need a docSet passed to it now that we're doing that in the reducer
    // if (!action.payload.cameFromFeed && docSet) {
    //   log('calling docSet.set %o', nextState)
    //   // TODO: where does the key come from
    //   docSet.setDoc('', nextState)
    // }

    // Disable persistence for now
    // Can we get changes for a whole DocSet?
    // or should each action we're handling just be a single Doc?
    // // Write all actions to the feed for persistence
    // const changes = A.getChanges(prevState, nextState)
    // feed.append(JSON.stringify(changes))

    return result
  }
}
