import { newid } from 'cevitxe-signal-client'
import debug from 'debug'
import { Cevitxe } from './Cevitxe'
import { pause } from './lib/pause'
import { ProxyReducer } from './types'
require('fake-indexeddb/auto')

const log = debug('cevitxe:test')

describe('Cevitxe (offline)', () => {
  interface FooState {
    settings: {
      foo?: number
    }
  }

  const initialLocalState: FooState = { settings: { foo: 1 } }

  const proxyReducer: ProxyReducer = ({ type, payload }) => {
    switch (type) {
      case 'SET_FOO':
        return {
          settings: s => (s.foo = payload.value),
        }
      default:
        return null
    }
  }

  const newDiscoveryKey = () => newid(6)

  const getLocalCevitxe = (port: number = 1234) => {
    const urls = [`ws://localhost:${port}`]
    const databaseName = `local-${newid()}`
    return new Cevitxe({ databaseName, proxyReducer, initialState: initialLocalState, urls })
  }

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
      expect.assertions(6)
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

      // dispatch a change
      localStore.dispatch({
        type: 'SET_FOO',
        payload: { value: 3 },
      })

      // confirm that the change was made
      const state = localStore.getState()
      expect(state.settings.foo).toEqual(3)

      await pause(100) // HACK: wait for indexeddb to finish whatever it's doing
      await localCevitxe.close()
    })

    it('should use the reducer we gave it', async () => {
      expect.assertions(1)

      const discoveryKey = newDiscoveryKey()
      const localCevitxe = await getLocalCevitxe()
      const localStore = await localCevitxe.createStore(discoveryKey)

      // dispatch a change
      localStore.dispatch({ type: 'SET_FOO', payload: { value: 3 } })

      // confirm that the change was made
      const state = localStore.getState()
      expect(state.settings.foo).toEqual(3)

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

      const state = localStore.getState()
      expect(state.settings.foo).toEqual(1)

      // To simulate rehydrating from persisted state we dispatch a change to our local store.
      // This state gets written to our fake-indexeddb.
      localStore.dispatch({ type: 'SET_FOO', payload: { value: 42 } })

      // confirm that the change took
      const updatedState = localStore.getState()
      expect(updatedState.settings.foo).toEqual(42)

      // disconnect current store
      await pause(500) // HACK:
      await localCevitxe.close()

      // Then we create a new store, which should see the state in the fake db and load it
      const newStore = await localCevitxe.joinStore(discoveryKey)

      // Confirm that the modified state is still there
      const newState = newStore.getState()
      expect(newState.settings.foo).toEqual(42)
    })
  })
})
