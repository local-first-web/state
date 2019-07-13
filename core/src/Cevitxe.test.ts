require('fake-indexeddb/auto')
import { cleanup } from 'signalhub'
import A from 'automerge'
import debug from 'debug'
import uuid from 'uuid'
import { Cevitxe } from './Cevitxe'
import { pause } from './helpers/pause'
import { ProxyReducer } from './types'
import { Store } from 'redux'
import webrtcSwarm from 'webrtc-swarm'
const log = debug('cevitxe:tests')

interface FooState {
  foo?: number
}

const initialState: FooState = { foo: 1 }

const proxyReducer: ProxyReducer<FooState> = ({ type, payload }) => {
  switch (type) {
    case 'SET_FOO':
      return state => (state.foo = payload.value)
    default:
      return null
  }
}

describe('Cevitxe', () => {
  let cevitxe: Cevitxe<FooState>
  let documentId: string
  const initialState: FooState = { foo: 1 }
  let store: Store

  beforeEach(() => {
    documentId = uuid()
    cevitxe = new Cevitxe({ proxyReducer, initialState })
  })

  // afterEach(async () => {
  //   if (cevitxe) await cevitxe.close()
  // })

  it('joinStore should return a connected redux store', async () => {
    expect.assertions(2)
    const store = await cevitxe.joinStore(documentId)
    expect(store).not.toBeUndefined()
    expect(store.getState()).toEqual({})
  })

  describe('connections enabled', () => {
    beforeEach(async () => {
      webrtcSwarm._setEnablePeerConnections(true)
      store = await cevitxe.createStore(documentId)
    })

    afterEach(() => {
      log('afterEach')
      cleanup()
    })

    it('createStore should return a connected redux store', async () => {
      expect.assertions(2)
      expect(store).not.toBeUndefined()
      expect(store.getState()).toEqual(A.from(initialState))
    })

    it('should use the reducer we gave it', () => {
      store.dispatch({ type: 'SET_FOO', payload: { value: 3 } })
      const doc = store.getState()
      expect(doc.foo).toEqual(3)
    })

    it('should return something that looks like a store', () => {
      expect(store).toHaveProperty('getState')
      expect(store).toHaveProperty('dispatch')
      expect(store).toHaveProperty('subscribe')
    })

    it('{FLAKY TEST} should communicate changes from one store to another', async done => {
      // instantiate remote store

      const remoteCevitxe = new Cevitxe({
        proxyReducer,
        initialState: {},
        onReceive,
        databaseName: 'remote-store',
      })

      remoteCevitxe.joinStore(documentId)
      // We're going to intentionally delay changes to the local store,
      // this allows us to test receiving of the initial state and additional changes
      let receiveCount = 0
      function onReceive(message: any) {
        if (receiveCount === 0) expect(store.getState().foo).toEqual(1)
        if (receiveCount === 1) {
          expect(store.getState().foo).toEqual(42)
          done()
        }
        receiveCount++
      }
      // Delay new change to the local store so remote gets 2 separate messages
      await pause(1000)
      // change something in the local store
      store.dispatch({ type: 'SET_FOO', payload: { value: 42 } })
    })
  })

  describe('connections disabled', () => {
    beforeEach(async () => {
      webrtcSwarm._setEnablePeerConnections(false)
      store = await cevitxe.createStore(documentId)
    })

    // To simulate rehydrating from persisted state we create an initial store and
    // add some changes. This state gets written to our fake-indexeddb.
    // Then we close the current feed and create a new store, which should see the
    // state in the fake db and load it
    it('should rehydrate from persisted state when available', async done => {
      // make changes to local state
      store.dispatch({
        type: 'SET_FOO',
        payload: {
          value: 42,
        },
      })
      expect(store.getState().foo).toBe(42)
      // Short wait to let storage finish writing
      await pause(100)
      // disconnect current store
      // await cevitxe.close()

      // // create a new store and verify it has previous state from storage
      // const newStore = await cevitxe.createStore(documentId)
      // expect(store.getState().foo).toBe(42)
      done()
    })
  })

  it.skip('close should destroy any current store', async () => {
    expect.assertions(2)
    await cevitxe.createStore(documentId)
    expect(cevitxe.getStore()).not.toBeUndefined()
    await cevitxe.close()
    expect(cevitxe.getStore()).toBeUndefined()
  })

  it.skip('close should close all connections', async () => {
    // expect.assertions(2)
    await cevitxe.createStore(documentId)
    // @ts-ignore
    expect(cevitxe.connections).not.toBeUndefined()
    // @ts-ignore
    expect(cevitxe.swarm).not.toBeUndefined()
    // @ts-ignore
    expect(cevitxe.hub).not.toBeUndefined()
    await pause(100)
    cevitxe.close()
    // @ts-ignore
    expect(cevitxe.connections).toBeUndefined()
    // @ts-ignore
    expect(cevitxe.swarm).toBeUndefined()
    // @ts-ignore
    expect(cevitxe.hub).toBeUndefined()
  })
})
