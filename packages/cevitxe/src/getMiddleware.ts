import debug from 'debug'
import { Middleware } from 'redux'
import { ProxyReducer, ChangeMap } from 'cevitxe-types'
import { DELETE_COLLECTION, RECEIVE_MESSAGE_FROM_PEER, GLOBAL } from './constants'
import { Repo } from './Repo'
import A, { ChangeFn } from 'automerge'
import { toArray } from './toArray'

const log = debug('cevitxe:middleware')

export type MiddlewareFactory = (
  feed: Repo,
  proxyReducer: ProxyReducer,
  discoveryKey?: string
) => Middleware

export const getMiddleware: MiddlewareFactory = (repo, proxyReducer) => {
  return store => next => async action => {
    // BEFORE CHANGES
    // ... nothing to do here

    // MAKE CHANGES
    const newState = next(action)

    // AFTER CHANGES

    log('%o', { action })

    if (action.type === RECEIVE_MESSAGE_FROM_PEER) {
      // Synchronizer has already updated our repo - nothing to do here
    } else {
      // A reducer can return a function, a map of functions, or an array combining the two
      const reducerOutput = proxyReducer(store.getState(), action)

      // The reducer has already applied changes synchronously to repo snapshots. Here we persist
      // the Automerge changes, which will also trigger synchronization with any peers we're
      // connected to.

      if (reducerOutput === null) {
        // Nothing for us to do (could be an action handled elsewhere)
      } else {
        // Apply changes to Repo history
        for (const fnMapOrFn of toArray(reducerOutput)) {
          if (typeof fnMapOrFn === 'function') {
            // Single function - apply to global object
            const fn = fnMapOrFn as ChangeFn<any>
            await repo.change(GLOBAL, fn)
          } else {
            // Multiple functions - apply to each document
            for (let documentId in fnMapOrFn) {
              const fnOrSymbol = fnMapOrFn[documentId]
              if (fnOrSymbol === DELETE_COLLECTION) {
                // Implement collection deletion flag
                await repo.markCollectionAsDeleted(documentId)
              } else if (typeof fnOrSymbol === 'function') {
                // Apply change to each document
                const fn = fnOrSymbol as ChangeFn<any>
                await repo.change(documentId, fn)
              }
            }
          }
        }
      }
    }

    return newState
  }
}
