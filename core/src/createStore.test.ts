require('fake-indexeddb/auto')

import * as Redux from 'redux'
import automerge, { Connection, Message } from 'automerge'
import { createStore } from './createStore'
import { ProxyReducer } from './types'
import { actions } from './actions'
import { CevitxeConnection } from './connection'
import { DOC_ID } from './constants'

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

    store = await createStore({
      discoveryKey,
      proxyReducer,
      defaultState,
    })
  })

  it('should return something that looks like a store', () => {
    expect(store).toHaveProperty('getState')
    expect(store).toHaveProperty('dispatch')
    expect(store).toHaveProperty('subscribe')
  })

  it('should have added APPLY_MESSAGE to our reducer', () => {
    // Make a change in order to capture the automerge `change` object
    const docSet = store.getState()
    const doc0 = docSet.getDoc(DOC_ID)
    expect(doc0.foo).toEqual('hello world')

    const connection = new CevitxeConnection(docSet)

    const doc1 = automerge.change(doc0, 'testing', s => (s.foo = 'pizza'))
    const changes = automerge.getChanges(doc0, doc1)
    const msg = {
      docId: DOC_ID,
      clock: {},
      changes,
    }

    expect(msg.changes[0].message).toEqual('testing')

    store.dispatch(actions.applyMessage(msg, connection))

    const doc = store.getState().getDoc(DOC_ID)
    expect(doc.foo).toEqual('pizza')
  })

  it('should use the reducer we gave it', () => {
    store.dispatch({ type: 'SET_FOO', payload: { value: 'wahoo' } })

    const doc = store.getState().getDoc(DOC_ID)
    expect(doc.foo).toEqual('wahoo')
  })
})
