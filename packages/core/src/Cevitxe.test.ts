import A from 'automerge'
import { Server } from 'cevitxe-signal-server'
import debug from 'debug'
import 'fake-indexeddb/auto'
import { Store } from 'redux'
import uuid from 'uuid'
import { Cevitxe } from './Cevitxe'
import { pause } from './lib/pause'
import { ProxyReducer } from './types'

const log = debug('cevitxe:tests')
const kill = require('kill-port')

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
  const port = 10004
  const urls = [`ws://localhost:${port}`]

  let server

  beforeAll(async () => {
    await kill(port, 'tcp')
    server = new Server({ port })
    await server.listen({ silent: true })
  })

  beforeEach(() => {
    documentId = uuid()
    const databaseName = 'test'
    localCevitxe = new Cevitxe({ databaseName, proxyReducer, initialState, urls })
  })

  // afterEach(async () => {
  //   if (cevitxe) await cevitxe.close()
  // })

  it('joinStore should return a connected redux store', async () => {
    expect.assertions(2)
    const store = await localCevitxe.joinStore(documentId)
    expect(store).not.toBeUndefined()
    expect(store.getState()).toEqual({})
  })

  describe('connections enabled', () => {
    beforeEach(async () => {
      localStore = await localCevitxe.createStore(documentId)
      log('instantiated local store')
    })

    afterEach(() => {
      log('afterEach')
    })

    it('createStore should return a connected redux store', async () => {
      expect.assertions(2)
      expect(localStore).not.toBeUndefined()
      expect(localStore.getState()).toEqual(A.from(initialState))
    })

    it('should use the reducer we gave it', () => {
      localStore.dispatch({ type: 'SET_FOO', payload: { value: 3 } })
      const doc = localStore.getState()
      expect(doc.foo).toEqual(3)
    })

    it('should return something that looks like a store', () => {
      expect(localStore).toHaveProperty('getState')
      expect(localStore).toHaveProperty('dispatch')
      expect(localStore).toHaveProperty('subscribe')
    })

    it('should communicate changes from one store to another', async done => {
      const remoteCevitxe = new Cevitxe({
        databaseName: 'remote-store',
        proxyReducer,
        initialState: {},
        urls,
        onReceive,
      })

      await remoteCevitxe.joinStore(documentId)
      log('instantiated remote store')

      let receiveCount = 0
      function onReceive(message: any) {
        log('onReceive %o', message)
        log('receiveCount', receiveCount)
        if (receiveCount === 0) {
          expect(localStore.getState().foo).toEqual(1)
        }
        if (receiveCount === 1) {
          expect(localStore.getState().foo).toEqual(42)
          done()
        }
        receiveCount++
      }
      // Delay new change to the local store so remote gets 2 separate messages
      await pause(1000)
      // change something in the local store
      localStore.dispatch({ type: 'SET_FOO', payload: { value: 42 } })
    })
  })
})

//   describe('connections disabled', () => {
//     beforeEach(async () => {
//       webrtcSwarm._setEnablePeerConnections(false)
//       store = await cevitxe.createStore(documentId)
//     })

//     // To simulate rehydrating from persisted state we create an initial store and
//     // add some changes. This state gets written to our fake-indexeddb.
//     // Then we close the current feed and create a new store, which should see the
//     // state in the fake db and load it
//     it('should rehydrate from persisted state when available', async done => {
//       // make changes to local state
//       store.dispatch({
//         type: 'SET_FOO',
//         payload: {
//           value: 42,
//         },
//       })
//       expect(store.getState().foo).toBe(42)
//       // Short wait to let storage finish writing
//       await pause(100)
//       // disconnect current store
//       // await cevitxe.close()

//       // // create a new store and verify it has previous state from storage
//       // const newStore = await cevitxe.createStore(documentId)
//       // expect(store.getState().foo).toBe(42)
//       done()
//     })
// })

//   it.skip('close should destroy any current store', async () => {
//     expect.assertions(2)
//     await cevitxe.createStore(documentId)
//     expect(cevitxe.store).not.toBeUndefined()
//     await cevitxe.close()
//     expect(cevitxe.store).toBeUndefined()
//   })

//   it.skip('close should close all connections', async () => {
//     // expect.assertions(2)
//     await cevitxe.createStore(documentId)
//     // @ts-ignore
//     expect(cevitxe.connections).not.toBeUndefined()
//     // @ts-ignore
//     expect(cevitxe.swarm).not.toBeUndefined()
//     // @ts-ignore
//     expect(cevitxe.hub).not.toBeUndefined()
//     await pause(100)
//     cevitxe.close()
//     // @ts-ignore
//     expect(cevitxe.connections).toBeUndefined()
//     // @ts-ignore
//     expect(cevitxe.swarm).toBeUndefined()
//     // @ts-ignore
//     expect(cevitxe.hub).toBeUndefined()
//   })
// })
