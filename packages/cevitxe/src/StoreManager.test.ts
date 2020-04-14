import { newid } from 'cevitxe-signal-client'
import { Server } from 'cevitxe-signal-server'
import { ProxyReducer } from 'cevitxe-types'
import { getPortPromise as getAvailablePort } from 'portfinder'
import { pause as _yield } from './pause'
import { StoreManager } from './StoreManager'
import { toArray } from './toArray'

describe('StoreManager', () => {
  const newDiscoveryKey = () => newid(6)

  let server: Server

  const collections = ['teachers']
  const teacher1 = { id: 'abcxyz', first: 'Herb', last: 'Caudill', phones: [] }
  const teacher2 = { id: 'defcba', first: 'Brent', last: 'Keller', phones: [] }
  const initialState = {
    settings: { theme: 'dark' },
    teachers: {},
  }

  afterEach(async () => {
    if (server) await server.close()
  })

  describe('solo', () => {
    const proxyReducer = ((state, { type, payload }) => {
      switch (type) {
        case 'ADD_TEACHER':
          return s => {
            for (const teacher of toArray(payload)) {
              s.teachers[teacher.id] = teacher
            }
          }
        case 'REMOVE_TEACHER':
          return s => {
            delete s.teachers[payload.id]
          }
        case 'ADD_PHONE': {
          const { id, phone } = payload
          return s => s.teachers[id].phones.push(phone)
        }
        default:
          return null
      }
    }) as ProxyReducer

    const open = async ({ join = false } = {}) => {
      const port = await getAvailablePort({ port: 3000 })
      const urls = [`ws://localhost:${port}`]
      server = new Server({ port })
      await server.listen({ silent: true })

      const discoveryKey = newDiscoveryKey()

      // local StoreManager & store
      const localStoreManager = new StoreManager({
        databaseName: `local-${newid()}`,
        proxyReducer,
        initialState,
        urls,
      })
      const localStore = join
        ? await localStoreManager.joinStore(discoveryKey)
        : await localStoreManager.createStore(discoveryKey)

      // include a teardown function in the return values
      const close = async () => {
        await localStoreManager.close()
      }

      return { close, localStoreManager, localStore, discoveryKey }
    }

    it('should join a store', async () => {
      const { close, localStore } = await open({ join: true })

      // store exists
      expect(localStore).not.toBeUndefined()

      // it looks like a store
      expect(localStore).toHaveProperty('getState')
      expect(localStore).toHaveProperty('dispatch')
      expect(localStore).toHaveProperty('subscribe')

      // it's in empty (waiting) state
      expect(localStore.getState()).toEqual({})

      await close()
      expect.assertions(5)
    })

    it('should create a store', async () => {
      const { close, localStore } = await open()

      // store exists
      expect(localStore).not.toBeUndefined()

      // it looks like a store
      expect(localStore).toHaveProperty('getState')
      expect(localStore).toHaveProperty('dispatch')
      expect(localStore).toHaveProperty('subscribe')

      // it contains the initial state
      expect(localStore.getState()).toEqual(initialState)

      await close()
      expect.assertions(5)
    })

    it('should dispatch a change', async () => {
      const { close, localStore } = await open()

      // dispatch a change
      localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher1 })

      await _yield()

      // confirm that the change was made
      const state = localStore.getState()
      expect(state.teachers.abcxyz.first).toEqual('Herb')

      await close()
      expect.assertions(1)
    })

    it('should handle two consecutive changes', async () => {
      const { close, localStore } = await open()

      // dispatch a change
      localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher1 })
      await _yield()
      localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher2 })
      await _yield()

      // confirm that the changes were made
      const state = localStore.getState()

      expect(state.teachers.abcxyz.first).toEqual('Herb')
      expect(state.teachers.defcba.first).toEqual('Brent')

      await close()
      expect.assertions(2)
    })

    it('should handle nested objects', async () => {
      const { close, localStore } = await open()

      localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher1 })
      await _yield()

      // add a phone object to the teacher's array of phones
      const { id } = teacher1
      const phone = { type: 'cell', number: '(202) 294-7901' }
      localStore.dispatch({ type: 'ADD_PHONE', payload: { id, phone } })
      await _yield()

      // confirm that the changes were made
      const state = localStore.getState()

      const allTeachers = state.teachers as any
      expect(allTeachers[id].phones).toEqual([phone])

      await close()
      expect.assertions(1)
    })

    it('should close a store', async () => {
      const { close, localStoreManager } = await open()

      // confirm that we have a store
      expect(localStoreManager.store).not.toBeUndefined()

      // close the store
      await close()

      // confirm the store is gone
      expect(localStoreManager.store).toBeUndefined()
      expect.assertions(2)
    })

    it('should persist state between sessions', async () => {
      const { close, localStoreManager, localStore, discoveryKey } = await open()

      // change something in the local store
      localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher1 })

      // wait for addition to take
      await _yield()

      // confirm that the changes took locally
      const state0 = localStore.getState()
      expect(state0.teachers).toEqual({ abcxyz: teacher1 })

      // disconnect store
      await localStoreManager.close()

      // Then we join the same store, which should see the state in the fake db and load it
      const localStore1 = await localStoreManager.joinStore(discoveryKey)
      await _yield()

      // Confirm that the modified state is still there
      const state1 = localStore1.getState()
      expect(state1.teachers).toEqual({ abcxyz: teacher1 })
      await close()
      expect.assertions(2)
    })

    it('should persist deletions', async () => {
      const { close, localStoreManager, localStore, discoveryKey } = await open()
      localStore.dispatch({ type: 'ADD_TEACHER', payload: [teacher1, teacher2] })

      // wait for both additions to take
      await _yield()

      const state0 = localStore.getState()
      expect(state0.teachers).toEqual({ abcxyz: teacher1, defcba: teacher2 })

      // delete something in the local store
      localStore.dispatch({ type: 'REMOVE_TEACHER', payload: teacher1 })

      // wait for deletion to take
      await _yield()

      // confirm that the deletion took locally
      const state1 = localStore.getState()
      expect(state1.teachers).toEqual({ defcba: teacher2 })

      // disconnect store
      await localStoreManager.close()

      // Then we create a new store, which should see the state in the fake db and load it
      const store2 = await localStoreManager.joinStore(discoveryKey)
      await _yield()

      // Confirm that the modified state is still there
      const newState = store2.getState()
      expect(newState.teachers).toEqual({ defcba: teacher2 })

      await close()
      expect.assertions(3)
    })
  })

  describe('using collections', () => {
    const proxyReducer = ((_, { type, payload }) => {
      switch (type) {
        case 'ADD_TEACHER': {
          const newTeachers = toArray(payload)
          return newTeachers.map(newTeacher => ({
            collection: 'teachers',
            id: newTeacher.id,
            fn: teacher => {
              Object.assign(teacher, newTeacher)
            },
          }))
        }
        case 'REMOVE_TEACHER':
          return {
            collection: 'teachers',
            id: payload.id,
            delete: true,
          }
        case 'UPDATE_TEACHER': {
          const updatedTeacher = payload
          return {
            collection: 'teachers',
            id: updatedTeacher.id,
            fn: teacher => {
              Object.assign(teacher, updatedTeacher)
            },
          }
        }
        case 'ADD_PHONE': {
          const { id, phone } = payload
          return {
            collection: 'teachers',
            id,
            fn: teacher => {
              teacher.phones.push(phone)
            },
          }
        }
        case 'DROP_TEACHERS':
          return {
            collection: 'teachers',
            drop: true,
          }

        default:
          return null
      }
    }) as ProxyReducer

    describe('solo', () => {
      const open = async ({ join = false } = {}) => {
        const port = await getAvailablePort({ port: 3000 })
        const urls = [`ws://localhost:${port}`]
        server = new Server({ port })
        await server.listen({ silent: true })

        const discoveryKey = newDiscoveryKey()

        // local StoreManager & store
        const localStoreManager = new StoreManager({
          databaseName: `local-${newid()}`,
          proxyReducer,
          initialState,
          urls,
          collections,
        })
        const localStore = join
          ? await localStoreManager.joinStore(discoveryKey)
          : await localStoreManager.createStore(discoveryKey)

        // include a teardown function in the return values
        const close = async () => {
          await localStoreManager.close()
        }

        return { close, localStoreManager, localStore, discoveryKey }
      }

      it('should join a store', async () => {
        const { close, localStore } = await open({ join: true })

        // store exists
        expect(localStore).not.toBeUndefined()

        // it looks like a store
        expect(localStore).toHaveProperty('getState')
        expect(localStore).toHaveProperty('dispatch')
        expect(localStore).toHaveProperty('subscribe')

        // it's in empty (waiting) state
        expect(localStore.getState()).toEqual({
          teachers: {},
        })

        await close()
        expect.assertions(5)
      })

      it('should create a store', async () => {
        const { close, localStore } = await open()

        // store exists
        expect(localStore).not.toBeUndefined()

        // it looks like a store
        expect(localStore).toHaveProperty('getState')
        expect(localStore).toHaveProperty('dispatch')
        expect(localStore).toHaveProperty('subscribe')

        // it contains the initial state
        expect(localStore.getState()).toEqual(initialState)

        await close()

        expect.assertions(5)
      })

      it('should dispatch a change', async () => {
        const { close, localStore } = await open()

        // dispatch a change
        localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher1 })

        await _yield()

        // confirm that the change was made
        const state = localStore.getState()

        const allTeachers = state.teachers as any
        expect(allTeachers.abcxyz.first).toEqual('Herb')

        await close()
        expect.assertions(1)
      })

      it('should handle two consecutive changes', async () => {
        const { close, localStore } = await open()

        // dispatch a change
        localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher1 })
        await _yield()
        localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher2 })
        await _yield()

        // confirm that the changes were made
        const state = localStore.getState()

        const allTeachers = state.teachers as any
        expect(allTeachers.abcxyz.first).toEqual('Herb')
        expect(allTeachers.defcba.first).toEqual('Brent')

        await close()
        expect.assertions(2)
      })

      it('should handle nested objects', async () => {
        const { close, localStore } = await open()

        localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher1 })
        await _yield()

        // add a phone object to the teacher's array of phones
        const { id } = teacher1
        const phone = { type: 'cell', number: '(202) 294-7901' }
        localStore.dispatch({ type: 'ADD_PHONE', payload: { id, phone } })
        await _yield()

        // confirm that the changes were made
        const state = localStore.getState()

        const allTeachers = state.teachers as any
        expect(allTeachers[id].phones).toEqual([phone])

        await close()
        expect.assertions(1)
      })

      it('should close a store', async () => {
        const { close, localStoreManager } = await open()

        // confirm that we have a store
        expect(localStoreManager.store).not.toBeUndefined()

        // close the store
        await close()

        // confirm the store is gone
        expect(localStoreManager.store).toBeUndefined()
        expect.assertions(2)
      })

      it('should persist state between sessions', async () => {
        const { close, localStoreManager, localStore, discoveryKey } = await open()

        // change something in the local store
        localStore.dispatch({ type: 'ADD_TEACHER', payload: [teacher1] })

        // wait for addition to take
        await _yield()

        // confirm that the changes took locally
        const state0 = localStore.getState()
        expect(state0.teachers).toEqual({ abcxyz: teacher1 })

        // disconnect store
        await localStoreManager.close()

        // Then we join the same store, which should see the state in the fake db and load it
        const localStore1 = await localStoreManager.joinStore(discoveryKey)
        await _yield()

        // Confirm that the modified state is still there
        const state1 = localStore1.getState()
        expect(state1.teachers).toEqual({ abcxyz: teacher1 })
        await close()
        expect.assertions(2)
      })

      it('should persist deletions', async () => {
        const { close, localStoreManager, localStore, discoveryKey } = await open()
        localStore.dispatch({ type: 'ADD_TEACHER', payload: [teacher1, teacher2] })

        // wait for both additions to take
        await _yield()

        const state0 = localStore.getState()
        expect(state0.teachers).toEqual({ abcxyz: teacher1, defcba: teacher2 })

        // delete something in the local store
        localStore.dispatch({ type: 'REMOVE_TEACHER', payload: teacher1 })

        // wait for deletion to take
        await _yield()

        // confirm that the deletion took locally
        const state1 = localStore.getState()
        expect(state1.teachers).toEqual({ defcba: teacher2 })

        // disconnect store
        await localStoreManager.close()

        // Then we create a new store, which should see the state in the fake db and load it
        const store2 = await localStoreManager.joinStore(discoveryKey)
        await _yield()

        // Confirm that the modified state is still there
        const newState = store2.getState()
        expect(newState.teachers).toEqual({ defcba: teacher2 })

        await close()
        // expect.assertions(3)
      })
    })

    describe('with a peer', () => {
      const open = async () => {
        const port = await getAvailablePort({ port: 3000 })
        const urls = [`ws://localhost:${port}`]
        server = new Server({ port })
        await server.listen({ silent: true })

        const initialState = {}
        const discoveryKey = newDiscoveryKey()

        // local storemanager & store
        const localStoreManager = new StoreManager({
          databaseName: `local-${newid()}`,
          proxyReducer,
          initialState,
          urls,
          collections,
        })
        // create new store locally
        const localStore = await localStoreManager.createStore(discoveryKey)

        // remote storemanager & store
        const remoteStoreManager = new StoreManager({
          databaseName: `remote-${newid()}`,
          proxyReducer,
          initialState,
          urls,
          collections,
        })
        // join store from remote peer
        const remoteStore = await remoteStoreManager.joinStore(discoveryKey)

        await _yield()

        // include a teardown function in the return values
        const close = async () => {
          await localStoreManager.close()
          await remoteStoreManager.close()
        }
        return {
          close,
          localStoreManager,
          remoteStoreManager,
          localStore,
          remoteStore,
          discoveryKey,
        }
      }

      it('should sync a new document', async () => {
        const { close, localStore, remoteStore } = await open()

        // change something in the local store
        localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher1 })

        // wait for remote peer to see change
        await _yield()

        const expectedState = { abcxyz: teacher1 }

        // confirm that the change took locally
        const localState = localStore.getState()
        expect(localState.teachers).toEqual(expectedState)

        // confirm that the remote store has the new value
        const remoteState = remoteStore.getState()
        expect(remoteState.teachers).toEqual(expectedState)

        await close()
        expect.assertions(2)
      })

      it('should sync changes to an existing document in both directions', async () => {
        const { close, localStore, remoteStore } = await open()

        localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher1 })
        await _yield()

        expect(localStore.getState().teachers).toEqual({ abcxyz: teacher1 })

        // modify the teacher in the local store
        localStore.dispatch({
          type: 'UPDATE_TEACHER',
          payload: { id: 'abcxyz', first: 'Herbert' },
        })
        await _yield()

        // modify the teacher in the remote store
        remoteStore.dispatch({
          type: 'UPDATE_TEACHER',
          payload: { id: 'abcxyz', email: 'h@hc3.me' },
        })

        await _yield()

        const expectedState = {
          abcxyz: { ...teacher1, first: 'Herbert', email: 'h@hc3.me' },
        }

        // confirm that the local store is caught up
        expect(localStore.getState().teachers).toEqual(expectedState)

        // confirm that the remote store is caught up
        expect(remoteStore.getState().teachers).toEqual(expectedState)

        await close()
        expect.assertions(3)
      })

      it('should sync new documents in both directions', async () => {
        const { close, localStore, remoteStore } = await open()

        // add a teacher in the local store
        localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher1 })
        await _yield()

        // add a teacher in the remote store
        remoteStore.dispatch({ type: 'ADD_TEACHER', payload: teacher2 })

        await _yield()

        const expectedState = {
          abcxyz: teacher1,
          defcba: teacher2,
        }

        // confirm that the local store is caught up
        expect(localStore.getState().teachers).toEqual(expectedState)

        // confirm that the remote store is caught up
        expect(remoteStore.getState().teachers).toEqual(expectedState)

        await close()
        expect.assertions(2)
      })

      it('should persist changes coming from a peer', async () => {
        const { close, localStore, remoteStoreManager, remoteStore, discoveryKey } = await open()

        // add a teacher in the local store
        localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher1 })
        await _yield()

        // change something in the local store
        localStore.dispatch({
          type: 'UPDATE_TEACHER',
          payload: { id: 'abcxyz', first: 'Herbert' },
        })
        await _yield()

        // confirm that both stores have the new value
        expect(remoteStore.getState().teachers.abcxyz!.first).toEqual('Herbert')
        expect(localStore.getState().teachers.abcxyz!.first).toEqual('Herbert')

        // disconnect both stores
        await close()

        // create a new store, which should see the state in the db and load it
        const newRemoteStore = await remoteStoreManager.joinStore(discoveryKey)
        await _yield()

        // confirm that the modified state is still there
        expect(newRemoteStore.getState().teachers.abcxyz!.first).toEqual('Herbert')

        await close()
        expect.assertions(3)
      })

      it('should persist deletions coming from a peer', async () => {
        const { close, localStore, remoteStoreManager, remoteStore, discoveryKey } = await open()

        // add a record
        localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher1 })
        await _yield()

        // confirm that the record is there before deleting it
        expect(localStore.getState().teachers).toHaveProperty('abcxyz')

        // delete a record in the local store
        localStore.dispatch({ type: 'REMOVE_TEACHER', payload: { id: 'abcxyz' } })
        await _yield()

        // confirm that the deletion took place locally
        expect(localStore.getState().teachers['abcxyz']).toBeFalsy() // null or undefined

        // confirm that the deletion took place in the remote store
        expect(remoteStore.getState().teachers['abcxyz']).toBeFalsy() // null or undefined

        // disconnect both stores
        await close()

        // reconnect remote store
        const newRemoteStore = await remoteStoreManager.joinStore(discoveryKey)
        await _yield()

        // Confirm that the deletion was persisted
        expect(newRemoteStore.getState().teachers).not.toHaveProperty('abcxyz')

        await close()
        expect.assertions(4)
      })

      it('should delete any connections', async () => {
        const { close, localStoreManager } = await open()

        // confirm that we have a connection
        expect(localStoreManager.connectionCount).toBe(1)

        await close()

        // confirm that we no longer have a connection
        expect(localStoreManager.connectionCount).toBe(0)
        expect.assertions(2)
      })

      it('should sync a dropped collection', async () => {
        const { close, localStore, remoteStore } = await open()

        // add a record
        localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher1 })
        await _yield()

        // confirm that the local store has initial state
        expect(Object.keys(localStore.getState().teachers).length).toBe(1)

        // confirm that the remote store has initial state
        expect(Object.keys(remoteStore.getState().teachers).length).toBe(1)

        // Drop teachers locally
        localStore.dispatch({ type: 'DROP_TEACHERS' })
        await _yield()

        // confirm that the local store is caught up
        expect(Object.keys(localStore.getState().teachers).length).toBe(0)

        // confirm that the remote store is caught up
        expect(Object.keys(remoteStore.getState().teachers).length).toBe(0)

        await close()
        expect.assertions(4)
      })
    })
  })
})
