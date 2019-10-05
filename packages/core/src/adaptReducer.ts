import A from 'automerge'
import { RECEIVE_MESSAGE_FROM_PEER, DELETE_COLLECTION } from './constants'
import { repoToObject } from './repoHelpers'
import { Reducer, AnyAction } from 'redux'
import { ProxyReducer, RepoSnapshot } from 'types'
import { collection } from './collection'
import { getMemUsage } from './lib/getMemUsage'
import debug from 'debug'
import { Repo } from 'Repo'

const log = debug('cevitxe:grid:adaptreducer')

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

          const oldDoc = repo.getDoc(documentId) || A.init()
          // run the change function to get a new document
          const newDoc = A.change(oldDoc, fn)
          // update the repo
          repo.setDoc(documentId, newDoc)
        }
      }
      log(`after applying changes`, getMemUsage())
    }

    const newState = repoToObject(repo) // TODO: replace with repo.getFullSnapshot or something
    return newState
  }

  return reducer
}
