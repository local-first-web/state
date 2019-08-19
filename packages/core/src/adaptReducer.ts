import A, { ChangeFn } from 'automerge'
import debug from 'debug'
import { RECEIVE_MESSAGE_FROM_PEER } from './constants'
import { ReducerConverter } from './types'
import { docSetToObject } from './docSetHelpers'

import { DELETE } from './constants'

const log = debug('cevitxe:adaptReducer')

// This function is used when wiring up the store. It takes a proxyReducer and turns it
// into a real reducer, plus adds our feedReducer to the pipeline.
export const adaptReducer: ReducerConverter = (proxyReducer, docSet) => (state, action) => {
  state = convertToReduxReducer(proxyReducer, docSet)(state, action)
  return state
}

// During initialization, we're given a `proxyReducer`, which is like a Redux reducer,
// except it's designed to work with automerge objects instead of plain javascript objects.
// Instead of returning a modified state, it returns change functions.

// Also, when it doesn't find a reducer for a given action, it returns `null` instead of the previous state.

// The purpose of this function is to turn a proxyReducer into a real reducer by
// running the proxyReducer's change functions through `automerge.change`.
const convertToReduxReducer: ReducerConverter = (proxyReducer, docSet) => (
  state,
  { type, payload }
) => {
  // Connection has already updated our docSet, update redux state to match
  if (type === RECEIVE_MESSAGE_FROM_PEER) return docSetToObject(docSet)

  const functionMap = proxyReducer({ type, payload })
  if (!functionMap || !state) return state // no matching function - return the unmodified state
  let docId: string
  for (docId in functionMap) {
    const fn = functionMap[docId] as ChangeFn<any> | symbol
    if (fn === DELETE) {
      docSet.removeDoc(docId)
    } else if (typeof fn === 'function') {
      // apply changes to the corresponding doc in the docset
      const oldDoc = docSet.getDoc(docId) || A.init() // create a new doc if one doesn't exist
      const newDoc = A.change(oldDoc, fn as ChangeFn<any>)
      docSet.setDoc(docId, newDoc)
    }
  }
  // return the new state of the docSet
  return docSetToObject(docSet)
}
