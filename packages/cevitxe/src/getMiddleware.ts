import debug from 'debug'
import { Middleware } from 'redux'
import { collection } from '.'
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
      // changes have already been applied by repo
    } else if (typeof functionMap === 'function') {
      log('running single change function')
      const fn = functionMap as A.ChangeFn<any>
      await repo.change(GLOBAL, fn)
    } else {
      log('running multiple change functions')
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
