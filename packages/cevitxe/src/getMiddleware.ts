import debug from 'debug'
import { Middleware } from 'redux'
import { ProxyReducer } from 'cevitxe-types'
import { DELETE_COLLECTION, RECEIVE_MESSAGE_FROM_PEER, GLOBAL } from './constants'
import { Repo } from './Repo'
import A from 'automerge'

const log = debug('cevitxe:middleware')

export type MiddlewareFactory = (
  feed: Repo,
  proxyReducer: ProxyReducer,
  discoveryKey?: string
) => Middleware

export const getMiddleware: MiddlewareFactory = (repo, proxyReducer) => {
  return store => next => async action => {
    // BEFORE CHANGES
    // ...

    // CHANGES
    const newState = next(action)

    // AFTER CHANGES

    log('%o', { action })

    const functionMap = proxyReducer(store.getState(), action)

    if (action.type === RECEIVE_MESSAGE_FROM_PEER) {
      // Synchronizer has already updated our repo - nothing to do here
    } else {
      // Apply changes to Repo history
      if (typeof functionMap === 'function') {
        // Single function - apply to global object
        const fn = functionMap as A.ChangeFn<any>
        await repo.change(GLOBAL, fn)
      } else {
        // Multiple functions - apply to each document
        for (let documentId in functionMap) {
          const fn = functionMap[documentId]
          if (fn === DELETE_COLLECTION) {
            await repo.markCollectionAsDeleted(documentId)
          } else if (typeof fn === 'function') {
            // Apply change to each document
            await repo.change(documentId, fn)
          }
        }
      }
    }

    return newState
  }
}
