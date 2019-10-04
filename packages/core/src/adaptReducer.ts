import A from 'automerge'
import { DocSet } from './DocSet'
import { RECEIVE_MESSAGE_FROM_PEER, DELETE_COLLECTION } from './constants'
import { docSetToObject } from './docSetHelpers'
import { Reducer, AnyAction } from 'redux'
import { ProxyReducer, DocSetState } from 'types'
import { collection } from './collection'
import { getMemUsage } from './getMemUsage'
import debug from 'debug'

const log = debug('cevitxe:grid:adaptreducer')

export type ReducerConverter = (
  proxyReducer: ProxyReducer,
  docSet: DocSet<any>
) => Reducer<DocSetState, AnyAction>

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
 * @param docSet The store's docSet
 */
export const adaptReducer: ReducerConverter = (proxyReducer, docSet) => {
  const reducer: Reducer<DocSetState, AnyAction> = (state, { type, payload }): DocSetState => {
    if (type === RECEIVE_MESSAGE_FROM_PEER) {
      // Connection has already updated our docSet - nothing to do here.
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
          collection(name).removeAll(docSet)
        } else if (typeof fn === 'function') {
          // find the corresponding document in the docSet
          const oldDoc = docSet.getDoc(documentId) || A.init() // create a new doc if one doesn't exist
          // run the change function to get a new document
          const newDoc = A.change(oldDoc, fn)
          // update the docSet
          docSet.setDoc(documentId, newDoc)
        }
      }
      log(`after applying changes`, getMemUsage())
    }

    const newState = docSetToObject(docSet)
    return newState
  }

  return reducer
}
