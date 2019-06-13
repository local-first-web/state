import Automerge from 'automerge'
import { Reducer } from 'redux'
import { Action } from './types'
import { ProxyReducer } from './types'

type AR = <T>(proxyReducer: ProxyReducer<T>) => Reducer<T | undefined, Action>

export const automergeReducer: AR = proxyReducer => (state, action) => {
  const { type, payload } = action
  const msg = `${type}: ${JSON.stringify(payload)}`
  const fn = proxyReducer({ type, payload })
  return fn && state
    ? Automerge.change(state, msg, fn) // return a modified Automerge object
    : state // no matching change function was found, return state unchanged
}
