require('fake-indexeddb/auto')

const wrtc = require('wrtc')

import * as Redux from 'redux'
import { createStore, getDbName } from './createStore'
import { ProxyReducer, CevitxeStore } from './types'
import webrtcSwarm from 'webrtc-swarm'
import { cleanup } from 'signalhub'
import { deleteDB } from 'idb'
import { feedReducer } from './feedReducer'

jest.mock('webrtc-swarm')
jest.mock('signalhub')

const discoveryKey = '922e233117982b2fddaed3ad6adf8fc7bde6b4d8d8802a67663fdedbfedf00ea'
const dbName = getDbName(discoveryKey)

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
  let store: CevitxeStore

  beforeEach(async () => {
    const defaultState: FooState = { foo: 1 }
    store = await createStore({ discoveryKey, proxyReducer, defaultState })
  })

  afterEach(() => {
    cleanup()
  })

  it('should use the reducer we gave it', () => {
    store.store.dispatch({ type: 'SET_FOO', payload: { value: 3 } })
    const doc = store.store.getState()
    expect(doc.foo).toEqual(3)
  })

  it('should return something that looks like a store', () => {
    expect(store.store).toHaveProperty('getState')
    expect(store.store).toHaveProperty('dispatch')
    expect(store.store).toHaveProperty('subscribe')
    // store.feed.on('close', async () => {
    //   console.log('feed closed')
    //   // console.log('deleting', dbName)
    //   // // TODO: This fails to complete after the first test runs, do we need to close the feed to release the DB?
    //   // await deleteDB(dbName)
    //   // console.log('done deleting', dbName)
    // })
    // store.feed.close((err) => {
    //   console.log('feed close error', err)
    //   cleanup()
    // })
  })

  // it('should communicate changes from one store to another', async done => {
  //   // instantiate remote store
  //   const onReceive = (message: any) => {
  //     expect(remoteStore.getState().foo).toEqual(42)
  //     done()
  //   }

  //   const remoteStore = await createStore({ discoveryKey, proxyReducer, onReceive })

  //   // change something in the local store
  //   store.dispatch({ type: 'SET_FOO', payload: { value: 42 } })
  // })
})
