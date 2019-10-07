import A from 'automerge'
import { AnyAction, Reducer } from 'redux'
import { collection, DELETED } from './collection'
import { DELETE_COLLECTION, RECEIVE_MESSAGE_FROM_PEER } from './constants'
import { Repo } from './Repo'
import { ProxyReducer, RepoSnapshot } from './types'
import debug from 'debug'

export type ReducerConverter = (
  proxyReducer: ProxyReducer,
  repo: Repo<any>
) => Reducer<RepoSnapshot, AnyAction>

/**
 * This function, used when wiring up the store, takes a `proxyReducer` and turns it into a
 * garden-variety Redux reducer.
 *
 * @remarks
 * When we initialize a `StoreManager`, we give it a `proxyReducer`, which is like a Redux reducer,
 * except it's designed to work with Automerge objects instead of plain JavaScript objects. Instead
 * of returning a modified state, it returns one or more change functions.
 *
 * @param proxyReducer The proxyReducer to be adapted
 * @param repo The store's repo
 */
export const adaptReducer: ReducerConverter = (proxyReducer, repo) => {
  const log = debug(`cevitxe:adaptreducer:${repo.databaseName}`)
  const reducer: Reducer<RepoSnapshot, AnyAction> = (state, { type, payload }): RepoSnapshot => {
    repo.state = { ...(state || {}) }
    if (type === RECEIVE_MESSAGE_FROM_PEER) {
      // Connection has already updated our repo - nothing to do here.
    } else {
      const functionMap = proxyReducer(state, { type, payload })

      if (!functionMap) {
        // no matching function - return the unmodified state
        return state || {}
      }

      // Apply each change function to the corresponding document
      for (let documentId in functionMap) {
        const fn = functionMap[documentId] as A.ChangeFn<any> | symbol
        if (fn === DELETE_COLLECTION) {
          const name = collection.getCollectionName(documentId)
          collection(name).removeAll(repo)
        } else if (typeof fn === 'function') {
          // quickly update snapshot in memory; middleware will take care of making this official
          const doc: A.Doc<any> = A.from(repo.state[documentId] || {})
          const newDoc = A.change(doc, fn)
          repo.state[documentId] = { ...newDoc } // convert to plain object
          log('updated', documentId, newDoc)
        }
      }
    }
    return repo.state
  }

  return reducer
}
