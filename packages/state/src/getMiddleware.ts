import { ProxyReducer } from 'types'
import debug from 'debug'
import { Middleware } from 'redux'
import { RECEIVE_MESSAGE_FROM_PEER } from './constants'
import { Repo } from './Repo'
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
      const reducerOutput = proxyReducer(store.getState(), action)

      // The reducer has already applied changes synchronously to repo snapshots. Here we persist
      // the Automerge changes, which will also trigger synchronization with any peers we're
      // connected to.

      if (reducerOutput === null) {
        // Nothing for us to do (could be an action handled elsewhere)
      } else {
        // Apply changes to Repo history asynchronously
        for (const changeManifest of toArray(reducerOutput))
          await repo.applyChangeManifest(changeManifest)
      }
    }

    return newState
  }
}
