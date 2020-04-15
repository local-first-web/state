import { ProxyReducer, RepoSnapshot } from 'cevitxe-types'
import { AnyAction, Reducer } from 'redux'
import { RECEIVE_MESSAGE_FROM_PEER } from './constants'
import { Repo } from './Repo'
import { toArray } from './toArray'

export type ReducerAdapter = (
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
export const getReducer: ReducerAdapter = (proxyReducer, repo) => {
  const reducer: Reducer<RepoSnapshot, AnyAction> = (state, action): RepoSnapshot => {
    if (action.type === RECEIVE_MESSAGE_FROM_PEER) {
      // Synchronizer has already updated our repo - nothing to do here.
    } else {
      const reducerOutput = proxyReducer(state, action)

      // Here we apply changes synchronously to repo snapshots, so the user gets immediate
      // feedback. In `getMiddleware` we will persist the Automerge changes, which will also
      // trigger synchronization with any peers we're connected to.

      if (reducerOutput === null) {
        // Nothing for us to do (could be an action handled elsewhere)
      } else {
        // Replace all snapshots in the repo with the state we're given
        repo.setState(state || {})

        // Update snapshots synchronously
        const snapshotOnly = true
        for (const changeManifest of toArray(reducerOutput))
          repo.applyChangeManifest(changeManifest, snapshotOnly)
      }
    }

    return repo.getState()
  }

  return reducer
}
