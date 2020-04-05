import A from 'automerge'
import debug from 'debug'
import { AnyAction, Reducer } from 'redux'
import { RECEIVE_MESSAGE_FROM_PEER, DELETE_COLLECTION, GLOBAL } from './constants'
import { Repo } from './Repo'
import { ProxyReducer, RepoSnapshot, Snapshot } from 'cevitxe-types'

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
export const getReducer: ReducerConverter = (proxyReducer, repo) => {
  const log = debug(`cevitxe:getReducer:${repo.databaseName}`)

  const reducer: Reducer<RepoSnapshot, AnyAction> = (state, { type, payload }): RepoSnapshot => {
    if (type === RECEIVE_MESSAGE_FROM_PEER) {
      // RepoSync has already updated our repo - nothing to do here.
    } else {
      // Apply changes synchronously to repo snapshots
      state = state || {}
      const functionMap = proxyReducer(state, { type, payload })
      if (typeof functionMap === 'function') {
        // TODO make sure this doesn't bork any collections that exist
        repo.loadState({ [GLOBAL]: { ...state } }) // clone
        const fn = functionMap as A.ChangeFn<any>
        repo.changeSnapshot(GLOBAL, fn)
      } else {
        repo.loadState({ ...state }) // clone
        for (let documentId in functionMap) {
          const fn = functionMap[documentId] as A.ChangeFn<any> | symbol
          if (fn === DELETE_COLLECTION) {
            repo.removeCollectionSnapshots(documentId)
          } else if (typeof fn === 'function') {
            repo.changeSnapshot(documentId, fn)
          }
        }
      }
    }
    return repo.getState()
  }

  return reducer
}
