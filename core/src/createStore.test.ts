require('fake-indexeddb/auto')

import * as Redux from 'redux'
import { createStore } from './createStore'
import { ProxyReducer, CreateStoreResult } from './types'
import { cleanup } from 'signalhub'
import debug from 'debug'
import hypercoreCrypto from 'hypercore-crypto'
const log = debug('cevitxe:createStoreTests')

const pause = (t = 100) => new Promise(ok => setTimeout(ok, t))

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
  let storeResult: CreateStoreResult
  let discoveryKey: string

  beforeEach(async () => {
    log('beforeEach')
    discoveryKey = hypercoreCrypto.keyPair().publicKey.toString('hex')
    const defaultState: FooState = { foo: 1 }
    storeResult = await createStore({ discoveryKey, proxyReducer, defaultState })
  })

  afterEach(() => {
    log('afterEach')
    cleanup()
  })

  it('should use the reducer we gave it', () => {
    storeResult.store.dispatch({ type: 'SET_FOO', payload: { value: 3 } })
    const doc = storeResult.store.getState()
    expect(doc.foo).toEqual(3)
  })

  it('should return something that looks like a store', () => {
    expect(storeResult.store).toHaveProperty('getState')
    expect(storeResult.store).toHaveProperty('dispatch')
    expect(storeResult.store).toHaveProperty('subscribe')
  })

  it('should communicate changes from one store to another', async done => {
    // instantiate remote store
    const remoteStore = await createStore({
      discoveryKey,
      proxyReducer,
      onReceive,
      databaseName: 'remote-store',
    })

    // We're going to intentionally delay changes to the local store,
    // this allows us to test receiving of the initial state and additional changes
    let receiveCount = 0
    function onReceive(message: any) {
      if (receiveCount === 0) expect(remoteStore.store.getState().foo).toEqual(1)
      if (receiveCount === 1) {
        expect(remoteStore.store.getState().foo).toEqual(42)
        done()
      }
      receiveCount++
    }
    // Delay new change to the local store
    await pause(100)
    // change something in the local store
    storeResult.store.dispatch({ type: 'SET_FOO', payload: { value: 42 } })
  })
})
