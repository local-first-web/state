require('fake-indexeddb/auto')

const wrtc = require('wrtc')

import * as Redux from 'redux'
import { createStore } from './createStore'
import { ProxyReducer } from './types'
import webrtcSwarm from 'webrtc-swarm'
import { cleanup } from 'signalhub'

jest.mock('webrtc-swarm')
jest.mock('signalhub')

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

  afterEach(() => cleanup())

  it('should return something that looks like a store', () => {
    expect(store).toHaveProperty('getState')
    expect(store).toHaveProperty('dispatch')
    expect(store).toHaveProperty('subscribe')
  })

  describe.only('doin it live', () => {
    it('should communicate changes from one store to another', async done => {
      // instantiate remote store
      const onReceive = (message: any) => {
        expect(remoteStore.getState().foo).toEqual(42)
        done()
      }

      const remoteStore = await createStore({ discoveryKey, proxyReducer, onReceive })

      // change something in the local store
      store.dispatch({ type: 'SET_FOO', payload: { value: 42 } })
    })
  })

  it('should use the reducer we gave it', () => {
    store.dispatch({ type: 'SET_FOO', payload: { value: 3 } })

    const doc = store.getState()
    expect(doc.foo).toEqual(3)
  })
})
