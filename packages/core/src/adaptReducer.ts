import A from 'automerge'
import debug from 'debug'
import { AnyAction, Reducer } from 'redux'
import { RECEIVE_MESSAGE_FROM_PEER, DELETE_COLLECTION } from './constants'
import { Repo } from './Repo'
import { ProxyReducer, RepoSnapshot } from './types'
import { collection } from './collection'

export type ReducerConverter = (
  proxyReducer: ProxyReducer,
  repo: Repo<any>
) => Reducer<RepoSnapshot, AnyAction>

/**
 * This function, used when wiring up the store, takes a `proxyReducer` and turns it into a
 * garden-variety Redux reducer.
 *
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
    if (type === RECEIVE_MESSAGE_FROM_PEER) {
      // Connection has already updated our repo - nothing to do here.

      return repo.getState()
    } else {
      state = state || {}
      const functionMap = proxyReducer(state, { type, payload })
      if (!functionMap) {
        // no matching function - return the unmodified state
        return state
      }
      repo.loadState({ ...state }) // clone
      // Apply each change function to the corresponding document
      for (let documentId in functionMap) {
        const fn = functionMap[documentId] as A.ChangeFn<any> | symbol
        if (fn === DELETE_COLLECTION) {
          const name = collection.getCollectionName(documentId)
          // this updates snapshots synchronously then updates underlying data asynchronously
          collection(name).removeAllFromSnapshot(repo)
        } else if (typeof fn === 'function') {
          // update snapshot synchronously
          repo.changeSnapshot(documentId, fn)
        }
      }
      return repo.getState()
    }
  }

  return reducer
}
