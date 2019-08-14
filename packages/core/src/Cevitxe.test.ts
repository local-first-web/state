import { Server } from 'cevitxe-signal-server'
import { Cevitxe } from './Cevitxe'
import { newid } from 'cevitxe-signal-client'
import { ProxyReducer } from './types'
import { pause } from './lib/pause'
import eventPromise from 'p-event'

require('fake-indexeddb/auto')

interface Foo {
  foo?: number
}

interface FooState {
  state: Foo
}

const initialLocalState: FooState = { state: { foo: 1 } }
const initialRemoteState: FooState = { state: {} }

const port = 10000
const urls = [`ws://localhost:${port}`]

const proxyReducer: ProxyReducer<FooState> = ({ type, payload }) => {
  switch (type) {
    case 'SET_FOO':
      return s => (s.state.foo = payload.value)
    default:
      return null
  }
}

const newDiscoveryKey = () => newid(6)

const getLocalCevitxe = () => {
  const databaseName = `local-${newid()}`
  return new Cevitxe({ databaseName, proxyReducer, initialState: initialLocalState, urls })
}

const getRemoteCevitxe = () => {
  const databaseName = `remote-${newid()}`
  return new Cevitxe({ databaseName, proxyReducer, initialState: initialRemoteState, urls })
}

describe('Cevitxe', () => {
  describe('offline', () => {
    describe('joinStore', () => {
      it('should return a redux store with empty state', async () => {
        expect.assertions(2)

        const discoveryKey = newDiscoveryKey()
        const localCevitxe = await getLocalCevitxe()
        const localStore = await localCevitxe.joinStore(discoveryKey)

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
        const discoveryKey = newDiscoveryKey()
        const localCevitxe = await getLocalCevitxe()
        const localStore = await localCevitxe.createStore(discoveryKey)

        // store exists
        expect(localStore).not.toBeUndefined()

        // it looks like a store
        expect(localStore).toHaveProperty('getState')
        expect(localStore).toHaveProperty('dispatch')
        expect(localStore).toHaveProperty('subscribe')

        // it contains the initial state
        expect(localStore.getState()).toEqual(initialLocalState)

        await pause(100) // HACK: wait for indexeddb to finish whatever it's doing
        await localCevitxe.close()
      })

      it('should use the reducer we gave it', async () => {
        expect.assertions(1)

        const discoveryKey = newDiscoveryKey()
        const localCevitxe = await getLocalCevitxe()
        const localStore = await localCevitxe.createStore(discoveryKey)

        // dispatch a change
        localStore.dispatch({
          type: 'SET_FOO',
          payload: { value: 3 },
        })

        // confirm that the change was made
        expect(localStore.getState().state.foo).toEqual(3)

        await pause(100) // HACK: wait for indexeddb to finish whatever it's doing
        await localCevitxe.close()
      })
    })

    describe('close', () => {
      it('should destroy any current store', async () => {
        expect.assertions(2)

        const discoveryKey = newDiscoveryKey()
        const localCevitxe = await getLocalCevitxe()
        const localStore = await localCevitxe.createStore(discoveryKey) // don't need return value

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
        const discoveryKey = newDiscoveryKey()
        const localCevitxe = await getLocalCevitxe()
        const localStore = await localCevitxe.createStore(discoveryKey)

        expect(localStore.getState().state.foo).toBe(1)

        // To simulate rehydrating from persisted state we dispatch a change to our local store.
        // This state gets written to our fake-indexeddb.
        localStore.dispatch({
          type: 'SET_FOO',
          payload: { value: 42 },
        })

        // confirm that the change took
        expect(localStore.getState().state.foo).toBe(42)

        // disconnect current store
        await pause(500) // HACK:
        await localCevitxe.close()

        // Then we create a new store, which should see the state in the fake db and load it
        const newStore = await localCevitxe.joinStore(discoveryKey)

        expect(newStore.getState().state.foo).toBe(42)
      })
    })
  })

  describe('online', () => {
    const open = async () => {
      const server = new Server({ port })
      await server.listen({ silent: true })

      const discoveryKey = newDiscoveryKey()

      // local cevitxe & store
      const localCevitxe = getLocalCevitxe()
      const localStore = await localCevitxe.createStore(discoveryKey)

      // remote cevitxe (tests control timing of joining store)
      const remoteCevitxe = getRemoteCevitxe()

      // join store from remote store
      const remoteStore = await remoteCevitxe.joinStore(discoveryKey)

      // wait for local peer to see connection
      await eventPromise(localCevitxe, 'peer')

      // include a teardown function in the return values
      const close = async () => {
        await localCevitxe.close()
        await remoteCevitxe.close()
        await server.close()
      }

      return { close, localCevitxe, remoteCevitxe, localStore, remoteStore }
    }

    it('should communicate changes from one store to another', async () => {
      const { close, remoteCevitxe, localStore, remoteStore } = await open()

      // change something in the local store
      localStore.dispatch({
        type: 'SET_FOO',
        payload: { value: 42 },
      })

      // confirm that the change took locally
      expect(localStore.getState().state.foo).toBe(42)

      // wait for remote peer to see change
      await eventPromise(remoteCevitxe, 'change')

      // confirm that the remote store has the new value
      expect(remoteStore.getState().state.foo).toBe(42)

      await close()
    })

    it('should communicate changes from one store to another', async () => {
      const { close, remoteCevitxe, localStore, remoteStore } = await open()

      // change something in the local store
      localStore.dispatch({
        type: 'SET_FOO',
        payload: { value: 42 },
      })

      // confirm that the change took locally
      expect(localStore.getState().state.foo).toBe(42)

      // wait for remote peer to see change
      await eventPromise(remoteCevitxe, 'change')

      // confirm that the remote store has the new value
      expect(remoteStore.getState().state.foo).toBe(42)

      await close()
    })

    describe('close', () => {
      it('should delete any connections', async () => {
        const { close, localCevitxe } = await open()

        // confirm that we have a connection
        expect(Object.keys(localCevitxe.connections)).toHaveLength(1)

        await close()

        // confirm that we no longer have a connection
        expect(Object.keys(localCevitxe.connections)).toHaveLength(0)
      })
    })
  })
})
