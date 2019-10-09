import debug from 'debug'
import { RECEIVE_MESSAGE_FROM_PEER } from './constants'
import { Repo } from './Repo'
import { ProxyReducer } from '.'
import { Middleware } from 'redux'

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
      // pass any changes coming from the peer to the repo
      const { documentId, changes } = action.payload.message
      log('apply message from peer', documentId)
      const newDoc = await repo.applyChanges(documentId, changes)
      newState[documentId] = { ...newDoc }
    } else if (functionMap) {
      for (let documentId in functionMap) {
        // apply change functions via the repo
        const fn = functionMap[documentId]
        if (typeof fn === 'function') {
          await repo.change(documentId, fn)
        }
      }
    }

    return newState
  }
}
