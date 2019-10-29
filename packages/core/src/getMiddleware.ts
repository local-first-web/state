import debug from 'debug'
import { Middleware } from 'redux'
import { collection, ProxyReducer } from '.'
import { DELETE_COLLECTION, RECEIVE_MESSAGE_FROM_PEER } from './constants'
import { Repo } from './Repo'

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
      // changes have already been applied by repo
    } else if (functionMap) {
      for (let documentId in functionMap) {
        const fn = functionMap[documentId]
        if (fn === DELETE_COLLECTION) {
          const name = collection.getCollectionName(documentId)
          await collection(name).markAllDeleted(repo)
        }
        // apply change functions via the repo
        else if (typeof fn === 'function') {
          log('apply change function', documentId)
          await repo.change(documentId, fn)
        }
      }
    }

    return newState
  }
}
