require('fake-indexeddb/auto')

import * as Redux from 'redux'
import automerge from 'automerge'
import { createStore } from './createStore'
import { ProxyReducer } from './types'
import { actions } from './actions'
// import { automergify } from './automergify'

const key = '922e233117982b2fddaed3ad6adf8fc7bde6b4d8d8802a67663fdedbfedf00ea'
const secretKey =
  '6ed567d0e9cdfa7392c0514e67561c94b9c6a91cd07bc0b647eb3d777e87c5ad922e233117982b2fddaed3ad6adf8fc7bde6b4d8d8802a67663fdedbfedf00ea'

interface FooState {
  foo: string
  boo?: string
}

const proxyReducer: ProxyReducer<FooState> = ({ type, payload }) => {
  switch (type) {
    case 'SET_FOO':
      return state => (state.foo = payload.value)

    default:
      return null
  }
}

describe('createStore', () => {
  let store: Redux.Store
  beforeEach(async () => {
    const defaultState = { foo: 'hello world' }

    store = await createStore({
      key,
      secretKey,
      proxyReducer,
      defaultState,
    })
  })

  it('should return something that looks like a store', () => {
    expect(store).toHaveProperty('getState')
    expect(store).toHaveProperty('dispatch')
    expect(store).toHaveProperty('subscribe')
  })

  it('should have added APPLY_CHANGE to our reducer', () => {
    // Make a change in order to capture the automerge `change` object
    const state0 = store.getState()

    expect(state0.foo).toEqual('hello world')

    const state1 = automerge.change(state0, 'testing', s => (s.foo = 'pizza'))
    const change = automerge.getChanges(state0, state1)[0]

    expect(change.message).toEqual('testing')

    store.dispatch(actions.applyChange(change))

    const state = store.getState()
    expect(state.foo).toEqual('pizza')
  })

  it('should use the reducer we gave it', () => {
    store.dispatch({ type: 'SET_FOO', payload: { value: 'wahoo' } })

    const state = store.getState()
    expect(state.foo).toEqual('wahoo')
  })
})
