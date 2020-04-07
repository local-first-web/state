import A from 'automerge'
import { AnyAction, Reducer } from 'redux'
import { RECEIVE_MESSAGE_FROM_PEER, DELETE_COLLECTION, GLOBAL } from './constants'
import { Repo } from './Repo'
import { ProxyReducer, RepoSnapshot, Snapshot, ChangeMap } from 'cevitxe-types'
import { toArray } from './toArray'

export type ReducerConverter = (
  proxyReducer: ProxyReducer,
  repo: Repo<any>
) => Reducer<RepoSnapshot, AnyAction>

/**
 * This function, used when wiring up the store, takes a `proxyReducer` and turns it into a
 * garden-variety Redux reducer.
 *
 * When we initialize a `StoreManager`, we give it a `proxyReducer`, which is like a Redux reducer,
 * except it's designed to work with Automerge objects instead of plain JavaScript objects. It takes
 * a state, but instead of returning a modified state, it returns one or more change functions.
 *
 * @param proxyReducer The proxyReducer to be converted
 * @param repo The store's repo
 */
export const getReducer: ReducerConverter = (proxyReducer, repo) => {
  const reducer: Reducer<RepoSnapshot, AnyAction> = (state, { type, payload }): RepoSnapshot => {
    if (type === RECEIVE_MESSAGE_FROM_PEER) {
      // Synchronizer has already updated our repo - nothing to do here.
    } else {
      // A reducer can return a function, a map of functions, or an array combining the two
      const reducerOutput = proxyReducer(state, { type, payload })

      if (reducerOutput === null) {
        // Nothing for us to do (could be an action handled elsewhere)
      } else {
        state = state || {}
        repo.loadState({ ...state }) // clone

        // Here we apply changes synchronously to repo snapshots, so the user gets immediate
        // feedback. In `getMiddleware` we will persist the Automerge changes, which will also
        // trigger synchronization with any peers we're connected to.

        for (const fnMapOrFn of toArray(reducerOutput)) {
          if (typeof fnMapOrFn === 'function') {
            // Single function - apply to global object
            const fn = fnMapOrFn as A.ChangeFn<any>
            repo.changeSnapshot(GLOBAL, fn)
          } else {
            // Multiple functions - apply to each document
            for (let documentId in fnMapOrFn) {
              const fnOrSymbol = fnMapOrFn[documentId]
              if (fnOrSymbol === DELETE_COLLECTION) {
                // Implement collection deletion flag
                repo.removeCollectionSnapshots(documentId)
              } else if (typeof fnOrSymbol === 'function') {
                // Apply change to each document
                const fn = fnOrSymbol as A.ChangeFn<any>
                repo.changeSnapshot(documentId, fn)
              }
            }
          }
        }
      }
    }
    return repo.getState()
  }

  return reducer
}
