import { newid } from 'cevitxe-signal-client'
import { Server } from 'cevitxe-signal-server'
import debug from 'debug'
import { getPortPromise as getAvailablePort } from 'portfinder'
import { Cevitxe } from './Cevitxe'
import { collection } from './collection'
import { ProxyReducer } from './types'
import { pause } from './lib/pause'

require('fake-indexeddb/auto')

const log = debug('cevitxe:test')

const teachersCollection = 'teachers'
const teachersKey = collection(teachersCollection).keyName

describe('Cevitxe (online:peerless)', () => {
  const newDiscoveryKey = () => newid(6)

  let server: Server

  afterEach(async () => {
    if (server) await server.close()
  })

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
    [teachersKey]: { abcxyz: true },
  }

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

    // include a teardown function in the return values
    const close = async () => {
      await localCevitxe.close()
    }

    return { close, localCevitxe, localStore, discoveryKey }
  }

  it('should persist state between local sessions', async () => {
    const { close, localCevitxe, localStore, discoveryKey } = await open()

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
    await pause(100) // HACK:
    await localCevitxe.close()

    // Then we create a new store, which should see the state in the fake db and load it
    const newLocalState = await localCevitxe.joinStore(discoveryKey)

    // Confirm that the modified state is still there
    const newState = newLocalState.getState()
    expect(newState).toEqual(expectedState)

    await pause(100) // HACK:
    await close()
  })

  it('persistence should handle deleted documents', async () => {
    const { close, localCevitxe, localStore, discoveryKey } = await open()

    // change something in the local store
    localStore.dispatch({ type: 'REMOVE_TEACHER', payload: defaultTeacher })

    const expectedState = {
      [teachersKey]: {},
    }

    // confirm that the change took locally
    const localState = localStore.getState()
    expect(localState).toEqual(expectedState)

    // disconnect store
    await pause(100) // HACK:
    await localCevitxe.close()

    // Then we create a new store, which should see the state in the fake db and load it
    const newLocalState = await localCevitxe.joinStore(discoveryKey)

    // Confirm that the modified state is still there
    const newState = newLocalState.getState()
    expect(newState).toEqual(expectedState)

    await pause(100) // HACK:
    await close()
  })
})
