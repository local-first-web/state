import automerge from 'automerge'
import { Reducer } from 'redux'
import { APPLY_CHANGE_FROM_FEED, INITIALIZE } from './constants'

export const feedReducer: Reducer = (state, { type, payload }) => {
  if (state === undefined) return {}
  switch (type) {
    case APPLY_CHANGE_FROM_FEED: {
      // After setting up the feed in `createStore`, we listen to the stream of data and dispatch
      // the incoming changes to our store. This is the reducer that handles those dispatches.
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
