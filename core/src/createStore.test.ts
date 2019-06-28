require('fake-indexeddb/auto')
const wrtc = require('wrtc')

import * as Redux from 'redux'
import { createStore, getDbName } from './createStore'
import webrtcSwarm from 'webrtc-swarm'
import { ProxyReducer } from './types'
import { cleanup } from 'signalhub'
import { deleteDB } from 'idb'
import debug from 'debug'
import hypercoreCrypto from 'hypercore-crypto'

const log = debug('cevitxe:createStoreTests')

jest.mock('webrtc-swarm')
jest.mock('signalhub')

let discoveryKey = '922e233117982b2fddaed3ad6adf8fc7bde6b4d8d8802a67663fdedbfedf00ea'
//const dbName = getDbName(discoveryKey)

/*
Notes:

I can get parallel tests to pass by creating a new discovery get in beforeEach. 
This still falls down when creating multiple stores in the same test because 
they share a feed DB (due to how we name them)

To combat the shared feed DB in the same test I'm passing a different databaseName for the remote store, 
which gets them properly created with expected initial states but the peers aren't sending data, investigating now.

If I comment out `await feedReady` in createStore, the peers start talking properly. I'm gonna see if increasing the jest timeout for this test helps.
No dice on that, increasing to even 20s doesn't get anything finished.



*/

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
    log('beforeEach')
    discoveryKey = hypercoreCrypto.keyPair().publicKey.toString('hex')
    const defaultState: FooState = { foo: 1 }
    store = await createStore({ discoveryKey, proxyReducer, defaultState })
  })

  afterEach(() => {
    log('afterEach')
    cleanup()
  })

  it('should use the reducer we gave it', () => {
    log('test starting: use the reducer')
    store.dispatch({ type: 'SET_FOO', payload: { value: 3 } })
    const doc = store.getState()
    expect(doc.foo).toEqual(3)
    log('test completed: use the reducer')
  })

  it('should return something that looks like a store', () => {
    log('test starting: looks like store')
    expect(store).toHaveProperty('getState')
    expect(store).toHaveProperty('dispatch')
    expect(store).toHaveProperty('subscribe')
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
    log('test completed: looks like store')
  })

  it.only('should communicate changes from one store to another', async done => {
    // instantiate remote store
    const onReceive = (message: any) => {
      expect(remoteStore.getState().foo).toEqual(42)
      done()
    }

    const remoteStore = await createStore({
      discoveryKey,
      proxyReducer,
      onReceive,
      databaseName: 'remote-store',
    })

    // change something in the local store
    //store.dispatch({ type: 'SET_FOO', payload: { value: 42 } })
  })
})
