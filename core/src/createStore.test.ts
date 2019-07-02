require('fake-indexeddb/auto')

import * as Redux from 'redux'
import { createStore } from './createStore'
import { ProxyReducer, CreateStoreResult } from './types'
import { cleanup } from 'signalhub'
import webrtcSwarm from 'webrtc-swarm'
import debug from 'debug'
import hypercoreCrypto from 'hypercore-crypto'
import { pause } from './helpers/pause';
const log = debug('cevitxe:createStoreTests')

interface FooState {
  foo?: number
}

const defaultState: FooState = { foo: 1 }

const proxyReducer: ProxyReducer<FooState> = ({ type, payload }) => {
  switch (type) {
    case 'SET_FOO':
      return state => (state.foo = payload.value)
    default:
      return null
  }
}

describe('createStore', () => {
  let localStoreResult: CreateStoreResult
  let discoveryKey: string

  const createKeyAndLocalStore = async (enableConnections: boolean) => {
    webrtcSwarm._setEnablePeerConnections(enableConnections)
    discoveryKey = hypercoreCrypto.keyPair().publicKey.toString('hex')
    localStoreResult = await createStore({ discoveryKey, proxyReducer, defaultState })
  }

  describe('connections enabled', () => {
    beforeEach(async () => {
      await createKeyAndLocalStore(true)
    })

    afterEach(() => {
      log('afterEach')
      cleanup()
    })

    it('should use the reducer we gave it', () => {
      localStoreResult.store.dispatch({ type: 'SET_FOO', payload: { value: 3 } })
      const doc = localStoreResult.store.getState()
      expect(doc.foo).toEqual(3)
    })

    it('should return something that looks like a store', () => {
      expect(localStoreResult.store).toHaveProperty('getState')
      expect(localStoreResult.store).toHaveProperty('dispatch')
      expect(localStoreResult.store).toHaveProperty('subscribe')
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
      localStoreResult.store.dispatch({ type: 'SET_FOO', payload: { value: 42 } })
    })
  })

  describe('connections disabled', () => {
    beforeEach(async () => {
      await createKeyAndLocalStore(false)
    })

    it.only('should rehydrate from persisted state when available', async done => {
      // make changes to local state
      //localStoreResult.store.dispatch({ type: 'SET_FOO', payload: { value: 42 } })
      // disconnect current store
      // localStoreResult.feed.close(feedClosed)
  
      const feedClosed = (_: any) => {
        console.log('feed closed')
        expect(localStoreResult.store.getState().foo).toBe(42)
        done()
        //   // create a new store
        //   const newStore = await createStore({ discoveryKey, proxyReducer, defaultState: {} })
        //   expect(newStore.store.getState().foo).toBe(43)
      }
    })
  })
})
