import { Server } from 'cevitxe-signal-server'
import { Cevitxe } from './Cevitxe'
import { newid } from 'cevitxe-signal-client'
import { ProxyReducer } from './types'
import { pause } from './lib/pause'
import eventPromise from 'p-event'

require('fake-indexeddb/auto')

interface FooState {
  foo?: number
}

const initialState: FooState = { foo: 1 }
const port = 10000
const urls = [`ws://localhost:${port}`]

const proxyReducer: ProxyReducer<FooState> = ({ type, payload }) => {
  switch (type) {
    case 'SET_FOO':
      return state => (state.foo = payload.value)
    default:
      return null
  }
}

const newDocumentId = () => newid(6)

const getLocalCevitxe = () => {
  const databaseName = `local-${newid()}`
  return new Cevitxe({ databaseName, proxyReducer, initialState, urls })
}

const getRemoteCevitxe = () => {
  const databaseName = `remote-${newid()}`
  return new Cevitxe({ databaseName, proxyReducer, initialState: {}, urls })
}

describe('Cevitxe', () => {
  describe('offline', () => {
    describe('joinStore', () => {
      it('should return a redux store with empty state', async () => {
        expect.assertions(2)

        const documentId = newDocumentId()
        const localCevitxe = await getLocalCevitxe()
        const localStore = await localCevitxe.joinStore(documentId)

        // store exists
        expect(localStore).not.toBeUndefined()

        // it's in empty (waiting) state
        expect(localStore.getState()).toEqual({})

        await pause(100) // HACK: wait for indexeddb to finish whatever it's doing
        await localCevitxe.close()
      })
    })

    describe('createStore', () => {
      it('should return a redux store', async () => {
        expect.assertions(5)
        const documentId = newDocumentId()
        const localCevitxe = await getLocalCevitxe()
        const localStore = await localCevitxe.createStore(documentId)

        // store exists
        expect(localStore).not.toBeUndefined()

        // it looks like a store
        expect(localStore).toHaveProperty('getState')
        expect(localStore).toHaveProperty('dispatch')
        expect(localStore).toHaveProperty('subscribe')

        // it contains the initial state
        expect(localStore.getState()).toEqual(initialState)

        await pause(100) // HACK: wait for indexeddb to finish whatever it's doing
        await localCevitxe.close()
      })

      it('should use the reducer we gave it', async () => {
        expect.assertions(1)

        const documentId = newDocumentId()
        const localCevitxe = await getLocalCevitxe()
        const localStore = await localCevitxe.createStore(documentId)

        // dispatch a change
        localStore.dispatch({
          type: 'SET_FOO',
          payload: { value: 3 },
        })

        // confirm that the change was made
        expect(localStore.getState().foo).toEqual(3)

        await pause(100) // HACK: wait for indexeddb to finish whatever it's doing
        await localCevitxe.close()
      })
    })

    describe('close', () => {
      it('should destroy any current store', async () => {
        expect.assertions(2)

        const documentId = newDocumentId()
        const localCevitxe = await getLocalCevitxe()
        const localStore = await localCevitxe.createStore(documentId) // don't need return value

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
      it('should rehydrate from persisted state when available', async () => {
        const documentId = newDocumentId()
        const localCevitxe = await getLocalCevitxe()
        const localStore = await localCevitxe.createStore(documentId)

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
    const startServer = async () => {
      const server = new Server({ port })
      await server.listen({ silent: true })
      return server
    }

    it('should communicate changes from one store to another', async () => {
      const server = await startServer()
      const documentId = newDocumentId()

      // local cevitxe & store
      const localCevitxe = getLocalCevitxe()
      const localStore = await localCevitxe.createStore(documentId)

      // remote cevitxe (tests control timing of joining store)
      const remoteCevitxe = getRemoteCevitxe()

      // join store from remote store
      const remoteStore = await remoteCevitxe.joinStore(documentId)

      // change something in the local store
      localStore.dispatch({
        type: 'SET_FOO',
        payload: { value: 42 },
      })

      // wait for remote peer to see change
      await eventPromise(remoteCevitxe, 'change')

      // confirm that the remote store has the new value
      expect(remoteStore.getState().foo).toBe(42)

      await localCevitxe.close()
      await remoteCevitxe.close()
      await server.close()
    })

    describe('close', () => {
      it('should delete any connections', async () => {
        const server = await startServer()
        const documentId = newDocumentId()

        // local cevitxe & store
        const localCevitxe = getLocalCevitxe()
        const localStore = await localCevitxe.createStore(documentId)

        // join store from remote peer
        const remoteCevitxe = getRemoteCevitxe()

        // join store from remote peer
        const _remoteStore = await remoteCevitxe.joinStore(documentId) // don't need the return value

        // wait for local peer to see connection
        const onPeer = eventPromise(localCevitxe, 'peer')
        await onPeer

        // confirm that we have a connection
        expect(Object.keys(localCevitxe.connections)).toHaveLength(1)

        await localCevitxe.close()
        await remoteCevitxe.close()
        await server.close()

        // confirm that we no longer have a connection
        expect(Object.keys(localCevitxe.connections)).toHaveLength(0)
      })
    })
  })
})
