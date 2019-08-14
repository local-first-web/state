import A from 'automerge'
import debug from 'debug'
import { AnyAction, Reducer } from 'redux'

import { RECEIVE_MESSAGE_FROM_PEER } from './constants'
import { ReceiveMessagePayload, ReducerConverter } from './types'

const log = debug('cevitxe:adaptReducer')

// This function is used when wiring up the store. It takes a proxyReducer and turns it
// into a real reducer, plus adds our feedReducer to the pipeline.
export const adaptReducer: ReducerConverter = (proxyReducer, docSet) => (state, action) => {
  state = feedReducer(state, action)
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
  const functionMap = proxyReducer({ type, payload, state })
  if (!functionMap || !state) return state // no matching function - return the unmodified state
  return Object.entries(functionMap).reduce((acc, [key, fn]) => {
    // iterate through the map
    // apply changes to the corresponding docs in the docset

    const itemState = acc[key]
  }, state)
}

// After setting up the feed in `createStore`, we listen to our connections and dispatch the
// incoming messages to our store. This is the reducer that handles those dispatches.
const feedReducer: Reducer = <T>(state: T, { type, payload }: AnyAction) => {
  switch (type) {
    case RECEIVE_MESSAGE_FROM_PEER: {
      const { message, connection } = payload as ReceiveMessagePayload
      log('received %o', message)

      const doc = connection.receive(message)
      return doc
    }
    default:
      return state
  }
}
