import { Server } from 'cevitxe-signal-server'
import debug from 'debug'
import { Store } from 'redux'
import { Cevitxe } from './Cevitxe'
import { newid } from './lib/newid'
import { ProxyReducer } from './types'
import { pause } from './lib/pause'
import pEvent from 'p-event'

require('fake-indexeddb/auto')

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

describe('Cevitxe', () => {
  let localCevitxe: Cevitxe<FooState>
  let documentId: string
  const initialState: FooState = { foo: 1 }
  let localStore: Store

  let port: number = 10000
  let urls = [`ws://localhost:${port}`]

  beforeEach(async () => {
    documentId = newid(6)
  })

  describe('offline', () => {
    beforeEach(async () => {
      // instantiate local store
      const databaseName = `test-${newid()}`
      localCevitxe = new Cevitxe({ databaseName, proxyReducer, initialState, urls })
    })

    afterEach(async () => {
      await pause(10) // HACK: wait for indexeddb to finish whatever it's doing
      await localCevitxe.close()
    })

    describe('joinStore', () => {
      beforeEach(async () => {
        localStore = await localCevitxe.joinStore(documentId)
      })

      it('joinStore should return a redux store with empty state', async () => {
        expect.assertions(2)
        expect(localStore).not.toBeUndefined()
        expect(localStore.getState()).toEqual({})
      })
    })

    describe('createStore', () => {
      beforeEach(async () => {
        localStore = await localCevitxe.createStore(documentId)
      })

      it('should return a connected redux store', async () => {
        expect.assertions(2)
        expect(localStore).not.toBeUndefined()
        expect(localStore.getState()).toEqual(initialState)
      })

      it('should use the reducer we gave it', async () => {
        expect.assertions(1)
        localStore.dispatch({ type: 'SET_FOO', payload: { value: 3 } })
        const doc = localStore.getState()
        expect(doc.foo).toEqual(3)
      })

      it('should return something that looks like a store', async () => {
        expect.assertions(3)
        expect(localStore).toHaveProperty('getState')
        expect(localStore).toHaveProperty('dispatch')
        expect(localStore).toHaveProperty('subscribe')
      })
    })

    describe('close', () => {
      beforeEach(async () => {
        localStore = await localCevitxe.createStore(documentId)
      })

      it('close should destroy any current store', async () => {
        expect.assertions(2)
        expect(localCevitxe.store).not.toBeUndefined()

        await pause(10) // HACK for indexeddb

        await localCevitxe.close()
        expect(localCevitxe.store).toBeUndefined()
      })
    })

    describe('persistence', () => {
      beforeEach(async () => {
        localStore = await localCevitxe.createStore(documentId)
      })

      it('should rehydrate from persisted state when available', async () => {
        expect(localStore.getState().foo).toBe(1)

        // To simulate rehydrating from persisted state we dispatch a change to our local store.
        // This state gets written to our fake-indexeddb.
        localStore.dispatch({
          type: 'SET_FOO',
          payload: {
            value: 42,
          },
        })
        expect(localStore.getState().foo).toBe(42)

        // disconnect current store
        await pause(500) // HACK:
        await localCevitxe.close()

        // Then we create a new store, which should see the state in the fake db and load it
        const newStore = await localCevitxe.joinStore(documentId)
        expect(newStore.getState().foo).toBe(42)
      })
    })
  })

  describe('online', () => {
    let server: Server
    let remoteCevitxe: Cevitxe<any>

    beforeEach(async () => {
      server = new Server({ port })
      await server.listen({ silent: true })

      // instantiate local store
      const databaseName = `local-${newid()}`
      localCevitxe = new Cevitxe({
        databaseName,
        proxyReducer,
        initialState,
        urls,
      })
      remoteCevitxe = new Cevitxe({
        databaseName: `remote-${newid()}`,
        proxyReducer,
        initialState: {},
        urls,
      })
      localStore = await localCevitxe.createStore(documentId)
    })

    async function close() {
      await localCevitxe.close()
      await remoteCevitxe.close()
      await server.close()
    }

    describe('close', () => {
      it('should close all connections', async () => {
        const onPeer = pEvent(localCevitxe, 'peer')
        // instantiate remote store
        await remoteCevitxe.joinStore(documentId)
        await onPeer
        expect(Object.keys(localCevitxe.connections)).toHaveLength(1)
        await close()
        expect(Object.keys(localCevitxe.connections)).toHaveLength(0)
      })
    })

    it('should communicate changes from one store to another', async () => {
      const remoteStore = await remoteCevitxe.joinStore(documentId)
      // change something in the local store
      localStore.dispatch({ type: 'SET_FOO', payload: { value: 42 } })
      await pEvent(remoteCevitxe, 'change')
      expect(remoteStore.getState().foo).toBe(42)
      await close()
    })
  })
})
