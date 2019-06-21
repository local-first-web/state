require('fake-indexeddb/auto')

import * as Redux from 'redux'
import automerge from 'automerge'
import { createStore } from './createStore'
import { ProxyReducer } from './types'
import { actions } from './actions'
import { Connection } from './connection'

const discoveryKey = '922e233117982b2fddaed3ad6adf8fc7bde6b4d8d8802a67663fdedbfedf00ea'

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
    store = await createStore({ discoveryKey, proxyReducer, defaultState })
  })

  it('should return something that looks like a store', () => {
    expect(store).toHaveProperty('getState')
    expect(store).toHaveProperty('dispatch')
    expect(store).toHaveProperty('subscribe')
  })

  it('should have and use the RECEIVE_MESSAGE reducer', () => {
    // Modify the document in order to capture the automerge changes
    const doc0 = store.getState()
    const doc1 = automerge.change(doc0, 'testing', s => (s.foo = 'pizza'))
    const changes = automerge.getChanges(doc0, doc1)

    // Assert that neither the original document nor the store has been modified
    expect(doc0.foo).toEqual('hello world')
    expect(store.getState().foo).toEqual('hello world')

    // Create a message containing the changes and dispatch the message
    const msg = { clock: {}, changes }
    const connection = new Connection(doc0)
    const action = actions.recieveMessage(msg, connection)
    store.dispatch(action)

    // Check that the store has now been updated
    const doc = store.getState()
    expect(doc.foo).toEqual('pizza')
  })

  it('should use the reducer we gave it', () => {
    store.dispatch({ type: 'SET_FOO', payload: { value: 'wahoo' } })

    const doc = store.getState()
    expect(doc.foo).toEqual('wahoo')
  })
})
