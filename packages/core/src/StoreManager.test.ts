import { newid } from 'cevitxe-signal-client'
import { Server } from 'cevitxe-signal-server'
import debug from 'debug'
import eventPromise from 'p-event'
import { getPortPromise as getAvailablePort } from 'portfinder'
import { StoreManager } from './StoreManager'
import { ProxyReducer } from './types'
import { pause } from './lib/pause'
import { collection } from './collection'

require('fake-indexeddb/auto')

describe('Cevitxe', () => {
  const log = debug('cevitxe:test')
  const teachersCollection = 'teachers'
  const teachersKey = collection(teachersCollection).keyName

  const proxyReducer = (({ type, payload }) => {
    switch (type) {
      case 'ADD_TEACHER': {
        return collection(teachersCollection).add(payload)
      }
      case 'REMOVE_TEACHER': {
        return collection(teachersCollection).remove(payload)
      }
      case 'UPDATE_TEACHER': {
        return collection(teachersCollection).update(payload)
      }
      default:
        return null
    }
  }) as ProxyReducer

  const defaultTeacher = { id: 'abcxyz', first: 'Herb', last: 'Caudill' }
  const initialState = {
    [defaultTeacher.id]: defaultTeacher,
    [teachersKey]: { [defaultTeacher.id]: true },
  }

  const newDiscoveryKey = () => newid(6)

  let server: Server

  afterEach(async () => {
    if (server) await server.close()
  })

  describe('solo', () => {
    const open = async () => {
      const port = await getAvailablePort({ port: 3000 })
      const urls = [`ws://localhost:${port}`]
      server = new Server({ port })
      await server.listen({ silent: true })

      const discoveryKey = newDiscoveryKey()

      // local cevitxe & store
      const localStoreManager = new StoreManager({
        databaseName: `local-${newid()}`,
        proxyReducer,
        initialState,
        urls,
      })
      // create new store locally
      const localStore = await localStoreManager.createStore(discoveryKey)

      // include a teardown function in the return values
      const close = async () => {
        await pause(100)
        await localStoreManager.close()
      }

      return { close, localStoreManager, localStore, discoveryKey }
    }

    it('should join a store', async () => {
      expect.assertions(5)
      const { close, localStore } = await open()

      // store exists
      expect(localStore).not.toBeUndefined()

      // it looks like a store
      expect(localStore).toHaveProperty('getState')
      expect(localStore).toHaveProperty('dispatch')
      expect(localStore).toHaveProperty('subscribe')

      // it's in empty (waiting) state
      expect(localStore.getState()).toEqual(initialState)

      await close()
    })

    it('should create a store', async () => {
      expect.assertions(6)

      const { close, localStore } = await open()

      // store exists
      expect(localStore).not.toBeUndefined()

      // it looks like a store
      expect(localStore).toHaveProperty('getState')
      expect(localStore).toHaveProperty('dispatch')
      expect(localStore).toHaveProperty('subscribe')

      // it contains the initial state
      expect(localStore.getState()).toEqual(initialState)

      // dispatch a change
      localStore.dispatch({
        type: 'UPDATE_TEACHER',
        payload: { id: 'abcxyz', first: 'Herbert' },
      })

      // confirm that the change was made
      const state = localStore.getState()
      expect(state.abcxyz.first).toEqual('Herbert')

      await close()
    })

    it('should close a store', async () => {
      // expect.assertions(2)
      const { close, localStoreManager } = await open()

      // confirm that we have a store
      expect(localStoreManager.store).not.toBeUndefined()

      // close the store
      await close()

      // confirm the store is gone
      expect(localStoreManager.store).toBeUndefined()
    })

    it('should persist state between sessions', async () => {
      const { close, localStoreManager, localStore, discoveryKey } = await open()

      // change something in the local store
      const newTeacher = { id: 'defcba', first: 'Brent', last: 'Keller' }
      localStore.dispatch({ type: 'ADD_TEACHER', payload: newTeacher })

      const expectedState = {
        abcxyz: { id: 'abcxyz', first: 'Herb', last: 'Caudill' },
        defcba: newTeacher,
        [teachersKey]: { abcxyz: true, defcba: true },
      }

      // confirm that the change took locally
      const localState = localStore.getState()
      expect(localState).toEqual(expectedState)

      // disconnect store
      await pause(500)
      await localStoreManager.close()

      // Then we create a new store, which should see the state in the fake db and load it
      const newLocalState = await localStoreManager.joinStore(discoveryKey)

      // Confirm that the modified state is still there
      const newState = newLocalState.getState()
      expect(newState).toEqual(expectedState)

      await close()
    })

    it('should persist deletions', async () => {
      const { close, localStoreManager, localStore, discoveryKey } = await open()

      // change something in the local store
      localStore.dispatch({ type: 'REMOVE_TEACHER', payload: { id: defaultTeacher.id } })

      const expectedState = {
        [teachersKey]: {},
      }

      // confirm that the change took locally
      const localState = localStore.getState()
      expect(localState).toEqual(expectedState)

      // disconnect store
      await pause(500)
      await localStoreManager.close()

      // Then we create a new store, which should see the state in the fake db and load it
      const newLocalState = await localStoreManager.joinStore(discoveryKey)

      // Confirm that the modified state is still there
      const newState = newLocalState.getState()
      expect(newState).toEqual(expectedState)

      await close()
    })
  })

  describe('with a peer', () => {
    const open = async () => {
      const port = await getAvailablePort({ port: 3000 })
      const urls = [`ws://localhost:${port}`]
      server = new Server({ port })
      await server.listen({ silent: true })

      const discoveryKey = newDiscoveryKey()

      // local cevitxe & store
      const localStoreManager = new StoreManager({
        databaseName: `local-${newid()}`,
        proxyReducer,
        initialState,
        urls,
      })
      // create new store locally
      const localStore = await localStoreManager.createStore(discoveryKey)

      // remote cevitxe
      const remoteStoreManager = new StoreManager({
        databaseName: `remote-${newid()}`,
        proxyReducer,
        initialState: {},
        urls,
      })
      // join store from remote peer
      const remoteStore = await remoteStoreManager.joinStore(discoveryKey)

      // wait for both peers to see connection
      await Promise.all([
        eventPromise(localStoreManager, 'peer'), //
        eventPromise(remoteStoreManager, 'peer'),
      ])

      // include a teardown function in the return values
      const close = async () => {
        await pause(500)
        await localStoreManager.close()
        await remoteStoreManager.close()
      }

      return { close, localStoreManager, remoteStoreManager, localStore, remoteStore, discoveryKey }
    }

    it('should sync multiple documents', async () => {
      const { close, remoteStoreManager, localStore, remoteStore } = await open()

      // change something in the local store
      const teacher = { id: 'defzyx', first: 'Mike', last: 'Tyson' }
      localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher })

      // wait for remote peer to see change
      log('awaiting remote change')
      await eventPromise(remoteStoreManager, 'change')

      const expectedState = {
        abcxyz: defaultTeacher,
        [teacher.id]: teacher,
        [teachersKey]: { abcxyz: true, [teacher.id]: true },
      }

      // confirm that the change took locally
      const localState = localStore.getState()
      expect(localState).toEqual(expectedState)

      // confirm that the remote store has the new value
      const remoteState = remoteStore.getState()
      expect(remoteState).toEqual(expectedState)

      await close()
    })

    it('should sync changes to an existing document in both directions', async () => {
      const { close, localStoreManager, remoteStoreManager, localStore, remoteStore } = await open()

      // modify the teacher in the local store
      localStore.dispatch({
        type: 'UPDATE_TEACHER',
        payload: { id: 'abcxyz', first: 'Herbert' },
      })
      await eventPromise(remoteStoreManager, 'change')

      // modify the teacher in the remote store
      remoteStore.dispatch({
        type: 'UPDATE_TEACHER',
        payload: { id: 'abcxyz', email: 'h@hc3.me' },
      })
      await eventPromise(localStoreManager, 'change')

      const expectedState = {
        abcxyz: { id: 'abcxyz', first: 'Herbert', last: 'Caudill', email: 'h@hc3.me' },
        [teachersKey]: { abcxyz: true },
      }

      // confirm that the local store is caught up
      const localState = localStore.getState()
      expect(localState).toEqual(expectedState)

      // confirm that the remote store is caught up
      const remoteState = remoteStore.getState()
      expect(remoteState).toEqual(expectedState)

      await close()
    })

    it('should sync new documents in both directions', async () => {
      const { close, localStoreManager, remoteStoreManager, localStore, remoteStore } = await open()

      // add a teacher in the local store
      const teacher1 = { id: 'ghijkl', first: 'Mike', last: 'Tyson' }
      localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher1 })
      await eventPromise(remoteStoreManager, 'change')

      // add a teacher in the remote store
      const teacher2 = { id: 'qrstuv', first: 'Brent', last: 'Keller' }
      remoteStore.dispatch({ type: 'ADD_TEACHER', payload: teacher2 })

      // waiting for two changes (index and object)
      await eventPromise(localStoreManager, 'change')
      await eventPromise(localStoreManager, 'change')

      const expectedState = {
        abcxyz: { id: 'abcxyz', first: 'Herb', last: 'Caudill' },
        [teacher1.id]: teacher1,
        qrstuv: { id: 'qrstuv', first: 'Brent', last: 'Keller' },
        [teachersKey]: { abcxyz: true, qrstuv: true, [teacher1.id]: true },
      }

      // confirm that the local store is caught up
      const localState = localStore.getState()
      expect(localState).toEqual(expectedState)

      // confirm that the remote store is caught up
      const remoteState = remoteStore.getState()
      expect(remoteState).toEqual(expectedState)

      await close()
    })

    it('should persist changes coming from a peer', async () => {
      const { close, remoteStoreManager, localStore, remoteStore, discoveryKey } = await open()

      // change something in the local store
      localStore.dispatch({
        type: 'UPDATE_TEACHER',
        payload: { id: 'abcxyz', first: 'Herbert' },
      })

      // wait for remote peer to see change
      await eventPromise(remoteStoreManager, 'change')

      // confirm that the remote store has the new value
      const remoteState = remoteStore.getState()
      expect(remoteState.abcxyz.first).toEqual('Herbert')

      // disconnect both stores
      await close()

      // Then we create a new store, which should see the state in the fake db and load it
      const newRemoteStore = await remoteStoreManager.joinStore(discoveryKey)

      // Confirm that the modified state is still there
      const newState = newRemoteStore.getState()
      expect(newState.abcxyz.first).toEqual('Herbert')

      await close()
    })

    it('should persist deletions coming from a peer', async () => {
      const { close, remoteStoreManager, localStore, remoteStore, discoveryKey } = await open()

      // confirm that the record is there before deleting it
      const localState = localStore.getState()
      expect(localState[teachersKey]).toHaveProperty('abcxyz')
      expect(localState).toHaveProperty('abcxyz')

      // delete a record in the local store
      localStore.dispatch({ type: 'REMOVE_TEACHER', payload: { id: 'abcxyz' } })

      // wait for remote peer to see change
      await eventPromise(remoteStoreManager, 'change')

      // confirm that the deletion took place locally
      const newLocalState = localStore.getState()
      expect(newLocalState[teachersKey]).not.toHaveProperty('abcxyz')
      expect(newLocalState).not.toHaveProperty('abcxyz')

      // confirm that the deletion took place in the remote store
      const newRemoteState = remoteStore.getState()
      expect(newRemoteState[teachersKey]).not.toHaveProperty('abcxyz')
      expect(newRemoteState).not.toHaveProperty('abcxyz')

      // disconnect both stores
      await close()

      // reconnect remote store
      const newRemoteStore = await remoteStoreManager.joinStore(discoveryKey)

      // Confirm that the modified state is still there
      const newNewRemoteState = newRemoteStore.getState()
      expect(newNewRemoteState[teachersKey]).not.toHaveProperty('abcxyz')
      expect(newNewRemoteState).not.toHaveProperty('abcxyz')

      await close()
    })

    it('should delete any connections', async () => {
      const { close, localStoreManager } = await open()

      // confirm that we have a connection
      expect(Object.keys(localStoreManager.connections)).toHaveLength(1)

      await close()

      // confirm that we no longer have a connection
      expect(Object.keys(localStoreManager.connections)).toHaveLength(0)
    })
  })
})
