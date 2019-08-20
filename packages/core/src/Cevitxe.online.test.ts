import { newid } from 'cevitxe-signal-client'
import { Server } from 'cevitxe-signal-server'
import debug from 'debug'
import eventPromise from 'p-event'
import { getPortPromise as getAvailablePort } from 'portfinder'
import { Cevitxe } from './Cevitxe'
import { ProxyReducer } from './types'
import { pause } from './lib/pause'

require('fake-indexeddb/auto')

const log = debug('cevitxe:test')

describe('Cevitxe (online)', () => {
  const newDiscoveryKey = () => newid(6)

  describe('single document', () => {
    interface FooState {
      settings: {
        foo?: number
      }
    }

    const initialLocalState: FooState = { settings: { foo: 1 } }
    const initialRemoteState = {}

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

    const getLocalCevitxe = (port: number = 1234) => {
      const urls = [`ws://localhost:${port}`]
      const databaseName = `local-${newid()}`
      return new Cevitxe({ databaseName, proxyReducer, initialState: initialLocalState, urls })
    }

    const getRemoteCevitxe = (port: number = 1234) => {
      const urls = [`ws://localhost:${port}`]
      const databaseName = `remote-${newid()}`
      return new Cevitxe({ databaseName, proxyReducer, initialState: initialRemoteState, urls })
    }

    let server: Server

    afterEach(async () => {
      if (server) await server.close()
    })

    const open = async () => {
      // const port = await getAvailablePort({ port: 3000 })
      const port = 3001

      server = new Server({ port })
      await server.listen({ silent: true })
      log('server listening')
      const discoveryKey = newDiscoveryKey()

      // local cevitxe & store
      const localCevitxe = getLocalCevitxe(port)
      const localStore = await localCevitxe.createStore(discoveryKey)
      log('localStore created')

      // remote cevitxe (tests control timing of joining store)
      const remoteCevitxe = getRemoteCevitxe(port)

      // join store from remote store
      const remoteStore = await remoteCevitxe.joinStore(discoveryKey)
      log('remoteStore created')

      // wait for local peer to see connection
      await eventPromise(localCevitxe, 'peer')
      log('localCevitxe sees peer')

      // include a teardown function in the return values
      const close = async () => {
        await localCevitxe.close()
        await remoteCevitxe.close()
      }

      return { close, localCevitxe, remoteCevitxe, localStore, remoteStore, discoveryKey }
    }

    it('should communicate changes from one store to another', async () => {
      const { close, remoteCevitxe, localStore, remoteStore } = await open()

      // change something in the local store
      localStore.dispatch({
        type: 'SET_FOO',
        payload: {
          value: 42,
        },
      })

      // wait for remote peer to see change
      await eventPromise(remoteCevitxe, 'change')

      // confirm that the change took locally
      const localState = localStore.getState()
      expect(localState.settings.foo).toEqual(42)

      // confirm that the remote store has the new value
      const remoteState = remoteStore.getState()
      expect(remoteState.settings.foo).toEqual(42)

      await close()
    })

    it('should persist changes coming from a peer', async () => {
      const {
        close,
        localCevitxe,
        remoteCevitxe,
        localStore,
        remoteStore,
        discoveryKey,
      } = await open()

      // change something in the local store
      localStore.dispatch({
        type: 'SET_FOO',
        payload: {
          value: 42,
        },
      })

      // wait for remote peer to see change
      await eventPromise(remoteCevitxe, 'change')

      // confirm that the remote store has the new value
      const remoteState = remoteStore.getState()
      expect(remoteState.settings.foo).toEqual(42)

      // disconnect both stores
      await pause(500) // HACK:
      await localCevitxe.close()
      await remoteCevitxe.close()

      // Then we create a new store, which should see the state in the fake db and load it
      const newRemoteStore = await remoteCevitxe.joinStore(discoveryKey)

      // Confirm that the modified state is still there
      const newState = newRemoteStore.getState()
      expect(newState.settings.foo).toEqual(42)

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

  describe('multiple documents', () => {
    let server: Server

    afterEach(async () => {
      if (server) await server.close()
    })

    interface SchoolData {
      teachers: {}
      [k: string]: any
    }

    const proxyReducer = (({ type, payload }) => {
      switch (type) {
        case 'ADD_TEACHER': {
          return {
            teachers: s => (s[payload.id] = true),
            [payload.id]: s => (s = Object.assign(s, payload)),
          }
        }
        case 'REMOVE_TEACHER': {
          return {
            teachers: s => delete s[payload.id],
            [payload.id]: s => undefined,
          }
        }
        case 'UPDATE_TEACHER': {
          return {
            [payload.id]: s => (s = Object.assign(s, payload)),
          }
        }
        default:
          return null
      }
    }) as ProxyReducer

    const initialState: SchoolData = { teachers: {} }

    const open = async () => {
      const port = await getAvailablePort({ port: 3000 })
      const urls = [`ws://localhost:${port}`]
      server = new Server({ port })
      await server.listen({ silent: true })

      const discoveryKey = newDiscoveryKey()

      // local cevitxe & store
      const localCevitxe = new Cevitxe({
        databaseName: `local-${newid()}`,
        proxyReducer,
        initialState,
        urls,
      })
      // create new store locally
      const localStore = await localCevitxe.createStore(discoveryKey)

      // remote cevitxe
      const remoteCevitxe = new Cevitxe({
        databaseName: `remote-${newid()}`,
        proxyReducer,
        initialState: {},
        urls,
      })
      // join store from remote peer
      const remoteStore = await remoteCevitxe.joinStore(discoveryKey)

      // wait for both peers to see connection
      await Promise.all([
        eventPromise(localCevitxe, 'peer'), //
        eventPromise(remoteCevitxe, 'peer'),
      ])

      // include a teardown function in the return values
      const close = async () => {
        await localCevitxe.close()
        await remoteCevitxe.close()
      }

      return { close, localCevitxe, remoteCevitxe, localStore, remoteStore }
    }

    it('should sync multiple documents', async () => {
      const { close, remoteCevitxe, localStore, remoteStore } = await open()

      // change something in the local store
      const teacher = { id: 'abcxyz', first: 'Herb', last: 'Caudill' }
      localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher })
      // wait for remote peer to see change
      log('awaiting remote change')
      await eventPromise(remoteCevitxe, 'change')

      const expectedState = {
        abcxyz: teacher,
        teachers: { abcxyz: true },
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
      const { close, localCevitxe, remoteCevitxe, localStore, remoteStore } = await open()

      // add a teacher in the local store
      const teacher1 = { id: 'abcxyz', first: 'Herb', last: 'Caudill' }
      localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher1 })
      await eventPromise(remoteCevitxe, 'change')

      // modify the teacher in the remote store
      remoteStore.dispatch({
        type: 'UPDATE_TEACHER',
        payload: { id: 'abcxyz', email: 'h@hc3.me' },
      })
      await eventPromise(localCevitxe, 'change')

      // modify the teacher in the local store
      localStore.dispatch({ type: 'UPDATE_TEACHER', payload: { id: 'abcxyz', first: 'Herbert' } })
      await eventPromise(remoteCevitxe, 'change')

      const expectedState = {
        abcxyz: { id: 'abcxyz', first: 'Herbert', last: 'Caudill', email: 'h@hc3.me' },
        teachers: { abcxyz: true },
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
      const { close, localCevitxe, remoteCevitxe, localStore, remoteStore } = await open()

      // add a teacher in the local store
      const teacher1 = { id: 'abcxyz', first: 'Herb', last: 'Caudill' }
      localStore.dispatch({ type: 'ADD_TEACHER', payload: teacher1 })
      await eventPromise(remoteCevitxe, 'change')

      // add a teacher in the remote store
      const teacher2 = { id: 'qrstuv', first: 'Brent', last: 'Keller' }
      remoteStore.dispatch({ type: 'ADD_TEACHER', payload: teacher2 })

      // HACK: waiting for both changes (index and object)
      await eventPromise(localCevitxe, 'change')
      await eventPromise(localCevitxe, 'change')

      const expectedState = {
        abcxyz: { id: 'abcxyz', first: 'Herb', last: 'Caudill' },
        qrstuv: { id: 'qrstuv', first: 'Brent', last: 'Keller' },
        teachers: { abcxyz: true, qrstuv: true },
      }

      // confirm that the local store is caught up
      const localState = localStore.getState()
      expect(localState).toEqual(expectedState)

      // confirm that the remote store is caught up
      const remoteState = remoteStore.getState()
      expect(remoteState).toEqual(expectedState)

      await close()
    })
  })
})
