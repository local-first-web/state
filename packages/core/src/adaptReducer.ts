import A from 'automerge'
import { AnyAction, Reducer } from 'redux'
import { collection } from './collection'
import { DELETE_COLLECTION, RECEIVE_MESSAGE_FROM_PEER } from './constants'
import { Repo } from './Repo'
import { repoToObject } from './repoHelpers'
import { ProxyReducer, RepoSnapshot } from './types'

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
  const reducer: Reducer<RepoSnapshot, AnyAction> = (state, { type, payload }): RepoSnapshot => {
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
          // find the corresponding document in the repo

          const oldDoc = repo.get(documentId) || A.init()
          // run the change function to get a new document
          const newDoc = A.change(oldDoc, fn)
          // update the repo
          repo.set(documentId, newDoc)
        }
      }
    }

    const newState = repoToObject(repo) // TODO: replace with repo.getFullSnapshot or something
    return newState
  }

  return reducer
}
