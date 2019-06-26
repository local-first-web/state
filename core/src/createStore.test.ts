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

  describe('doin it live', () => {
    it('should communicate changes from one store to another', async done => {
      // instantiate remote store
      const remoteStore = await createStore({ discoveryKey, proxyReducer })

      // change something in one
      store.dispatch({ type: 'SET_FOO', payload: { value: 42 } })

      // TODO: Find a better way to wait for the remote store to sync changes
      setTimeout(() => {
        // verify that change is reflected in the other
        expect(remoteStore.getState().foo).toEqual(42)
        done()
      }, 1000)
    })
  })

  it('should use the reducer we gave it', () => {
    store.dispatch({ type: 'SET_FOO', payload: { value: 3 } })

    const doc = store.getState()
    expect(doc.foo).toEqual(3)
  })
})

// describe('connection (live)', () => {
//   interface FooState {
//     foo?: number
//     boo?: number
//   }

//   const defaultState: FooState = automergify({ foo: 1 })

//   let localDocSet: SingleDocSet<FooState>
//   const makeDispatch = (docSet: SingleDocSet<FooState>): Dispatch<AnyAction> => ({
//     type,
//     payload,
//   }) => {
//     return {}
//   }

//   beforeEach(() => {
//     localDocSet = new SingleDocSet<FooState>(defaultState)
//   })

//   it('communicates local changes to remote peer', done => {
//     const remoteDocSet = new SingleDocSet<FooState>(automergify({}))

//     localPeer.on('connect', () => new Connection<FooState>(localDocSet, localPeer, makeDispatch(localDocSet)))

//     remotePeer.on(
//       'connect',
//       () => new Connection<FooState>(remoteDocSet, remotePeer, makeDispatch(localDocSet))
//     )

//     const localDoc = localDocSet.get()
//     const updatedDoc = automerge.change(localDoc, 'update', doc => (doc.boo = 2))

//     localDocSet.set(updatedDoc)

//     remoteDocSet.base.registerHandler((_, remoteDoc) => {
//       expect(remoteDoc.boo).toEqual(2)
//       done()
//     })
//   })
// })
