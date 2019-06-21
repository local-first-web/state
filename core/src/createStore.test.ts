require('fake-indexeddb/auto')

import * as Redux from 'redux'
import automerge from 'automerge'
import { createStore } from './createStore'
import { ProxyReducer } from './types'
import { actions } from './actions'
import { Connection } from './connection'
import { automergify } from './automergify'

const discoveryKey = '922e233117982b2fddaed3ad6adf8fc7bde6b4d8d8802a67663fdedbfedf00ea'

interface FooState {
  foo?: number
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
    const defaultState: FooState = { foo: 1 }
    store = await createStore({ discoveryKey, proxyReducer, defaultState })
  })

  it('should return something that looks like a store', () => {
    expect(store).toHaveProperty('getState')
    expect(store).toHaveProperty('dispatch')
    expect(store).toHaveProperty('subscribe')
  })

  it('should have and use the RECEIVE_MESSAGE reducer', () => {
    // Modify the document in order to capture the automerge changes
    const state1 = store.getState()
    const changes = automerge.getChanges(state1, automerge.change(state1, s => (s.foo = 2)))

    // Assert that neither the original document nor the store has been modified
    expect(state1.foo).toEqual(1)
    expect(store.getState().foo).toEqual(1)

    // Create a message containing the changes and dispatch the message
    const message = { clock: {}, changes }
    const connection = new Connection(state1)
    const action = actions.recieveMessage(message, connection)
    store.dispatch(action)

    // Check that the store has now been updated
    const state2 = store.getState()
    expect(state2.foo).toEqual(2)
  })

  it('should use the reducer we gave it', () => {
    store.dispatch({ type: 'SET_FOO', payload: { value: 3 } })

    const doc = store.getState()
    expect(doc.foo).toEqual(3)
  })
})
