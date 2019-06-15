import automerge from 'automerge'
import { Reducer } from 'redux'
import { APPLY_CHANGE_FROM_FEED, INITIALIZE } from './constants'
import { ReducerConverter } from './types'

const convertToReduxReducer: ReducerConverter = proxyReducer => (state, { type, payload }) => {
  const msg = `${type}: ${JSON.stringify(payload)}`
  const fn = proxyReducer({ type, payload })
  return fn && state
    ? automerge.change(state, msg, fn) // return a modified Automerge object
    : state // no matching function - return the unmodified state
}

const feedReducer: Reducer = (state, { type, payload }) => {
  if (state === undefined) return {}
  switch (type) {
    case APPLY_CHANGE_FROM_FEED: {
      const { change } = payload
      const isInitialState = change.message === INITIALIZE || state === undefined
      const prevState = isInitialState ? automerge.init() : state
      const newState = automerge.applyChanges(prevState, [change])
      return newState
    }

    default:
      return state
  }
}

export const adaptReducer: ReducerConverter = proxyReducer => (state, action) => {
  const state0 = state
  const state1 = feedReducer(state0, action)
  const state2 = convertToReduxReducer(proxyReducer)(state1, action)
  return state2
}
