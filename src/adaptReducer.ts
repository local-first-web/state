import { ReducerAdapter } from './types'
import automerge from 'automerge'
import { APPLY_CHANGE } from './constants'

export const adaptReducer: ReducerAdapter = proxyReducer => (
  state,
  { type, payload }
) => {
  switch (type) {
    case APPLY_CHANGE: {
      console.log('APPLY_CHANGE REDUCER!!')
      return automerge.applyChanges(state, [payload.change])
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
