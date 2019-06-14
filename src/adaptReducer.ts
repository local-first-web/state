import {} from './types'
import { ReducerAdapter } from './types'
import automerge from 'automerge'
import { APPLY_CHANGE_FROM_FEED, INITIALIZE } from './constants'

export const adaptReducer: ReducerAdapter = proxyReducer => (state, { type, payload }) => {
  switch (type) {
    case APPLY_CHANGE_FROM_FEED: {
      const { change } = payload
      let startingState = state

      if (change.message === INITIALIZE) startingState = automerge.init()
      const newState = automerge.applyChanges(startingState, [change])
      return newState
    }

    default: {
      const msg = `${type}: ${JSON.stringify(payload)}`
      const fn = proxyReducer({ type, payload })
      return fn && state
        ? automerge.change(state, msg, fn) // return a modified Automerge object
        : state // no matching change function was found, return state unchanged
    }
  }
}
