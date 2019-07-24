import { Server } from 'cevitxe-signal-server'
import { Store } from 'redux'
import { Cevitxe } from './Cevitxe'
import { newid } from 'cevitxe-signal-client'
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
    documentId = newid(6) // a bit longer so we can distinguish them from peer ids in logs
  })

  describe('offline', () => {
    beforeEach(async () => {
      const databaseName = `test-${newid()}`
      localCevitxe = new Cevitxe({ databaseName, proxyReducer, initialState, urls })
    })

    afterEach(async () => {
      await pause(100) // HACK: wait for indexeddb to finish whatever it's doing
      await localCevitxe.close()
    })

    describe('joinStore', () => {
      beforeEach(async () => {
        localStore = await localCevitxe.joinStore(documentId)
      })

      it('should return a redux store with empty state', async () => {
        expect.assertions(2)

        // store exists
        expect(localStore).not.toBeUndefined()

        // it's in empty (waiting) state
        expect(localStore.getState()).toEqual({})
      })
    })

    describe('createStore', () => {
      beforeEach(async () => {
        localStore = await localCevitxe.createStore(documentId)
      })

      it('should return a redux store', async () => {
        expect.assertions(5)

        // store exists
        expect(localStore).not.toBeUndefined()

        // it looks like a store
        expect(localStore).toHaveProperty('getState')
        expect(localStore).toHaveProperty('dispatch')
        expect(localStore).toHaveProperty('subscribe')

        // it contains the initial state
        expect(localStore.getState()).toEqual(initialState)
      })

      it('should use the reducer we gave it', async () => {
        expect.assertions(1)

        // dispatch a change
        localStore.dispatch({
          type: 'SET_FOO',
          payload: { value: 3 },
        })

        // confirm that the change was made
        expect(localStore.getState().foo).toEqual(3)
      })
    })

    describe('close', () => {
      beforeEach(async () => {
        localStore = await localCevitxe.createStore(documentId)
      })

      it('should destroy any current store', async () => {
        expect.assertions(2)

        // confirm that we have a store
        expect(localCevitxe.store).not.toBeUndefined()
        await pause(100) // HACK for indexeddb

        // close the store
        await localCevitxe.close()

        // confirm the store is gone
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
          payload: { value: 42 },
        })

        // confirm that the change took
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

      // local cevitxe & store
      const databaseName = `local-${newid()}`
      localCevitxe = new Cevitxe({
        databaseName,
        proxyReducer,
        initialState,
        urls,
      })
      localStore = await localCevitxe.createStore(documentId)

      // remote cevitxe (tests control timing of joining store)
      remoteCevitxe = new Cevitxe({
        databaseName: `remote-${newid()}`,
        proxyReducer,
        initialState: {},
        urls,
      })
    })

    async function close() {
      await localCevitxe.close()
      await remoteCevitxe.close()
      await server.close()
    }

    it('should communicate changes from one store to another', async () => {
      // join store from remote store
      const remoteStore = await remoteCevitxe.joinStore(documentId)

      // change something in the local store
      localStore.dispatch({
        type: 'SET_FOO',
        payload: { value: 42 },
      })

      // wait for remote peer to see change
      await pEvent(remoteCevitxe, 'change')

      // confirm that the remote store has the new value
      expect(remoteStore.getState().foo).toBe(42)

      await close()
    })

    describe('close', () => {
      it('should delete any connections', async () => {
        // join store from remote peer
        await remoteCevitxe.joinStore(documentId)

        // wait for local peer to see connection
        const onPeer = pEvent(localCevitxe, 'peer')
        await onPeer

        // confirm that we have a connection
        expect(Object.keys(localCevitxe.connections)).toHaveLength(1)

        await close()

        // confirm that we no longer have a connection
        expect(Object.keys(localCevitxe.connections)).toHaveLength(0)
      })
    })
  })
})
