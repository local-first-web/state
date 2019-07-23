import { Server } from 'cevitxe-signal-server'
import debug from 'debug'
import { Store } from 'redux'
import { Cevitxe } from './Cevitxe'
import { newid } from './lib/newid'
import { ProxyReducer } from './types'
import { pause } from './lib/pause'

require('fake-indexeddb/auto')

const log = debug('cevitxe:tests')

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

  let port: number = 10000 + Math.floor(Math.random() * 1000)
  let urls: string[]

  let server: Server

  describe('offline', () => {
    beforeEach(async () => {
      port++ // increment the port with each test
      urls = [`ws://localhost:${port}`]

      // instantiate local store
      documentId = newid(6)
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

      // it('close should destroy any current store', async () => {
      //   expect.assertions(2)
      //   expect(localCevitxe.store).not.toBeUndefined()

      //   await pause(500) // HACK:

      //   await localCevitxe.close()
      //   expect(localCevitxe.store).toBeUndefined()
      // })
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
    beforeEach(async () => {
      port++ // increment the port with each test to avoid conflicts
      urls = [`ws://localhost:${port}`]

      server = new Server({ port })
      await server.listen({ silent: true })

      // instantiate local store
      documentId = newid(6)
      const databaseName = `local-${newid()}`
      localCevitxe = new Cevitxe({
        databaseName,
        proxyReducer,
        initialState,
        urls,
      })
      localStore = await localCevitxe.createStore(documentId)
    })

    afterEach(async () => {
      await server.close()
    })

    describe('close', () => {
      it('should close all connections', async done => {
        // expect.assertions(2)
        // await pause(500)

        log('close test')

        localCevitxe.on('peer', () => {
          expect(Object.keys(localCevitxe.connections)).toHaveLength(1)
          done()
        })

        // instantiate remote store
        const remoteCevitxe = new Cevitxe({
          databaseName: `remote-${newid()}`,
          proxyReducer,
          initialState: {},
          urls,
        })
        const remoteStore = await remoteCevitxe.joinStore(documentId)

        // await pause(500)

        // await localCevitxe.close()

        // expect(Object.keys(localCevitxe.connections)).toHaveLength(0)
        // done()
      })
    })
  })
})

// it('should communicate changes from one store to another', async done => {
//   await remoteCevitxe.joinStore(documentId)

//   let receiveCount = 0
//   function onReceive(message: any) {
//     const { foo } = localStore.getState()
//     log('pass', receiveCount, foo)

//     // TODO this is bullshit

//     // if (receiveCount < 2) {
//     //   expect(foo).toEqual(1)
//     // } else {
//     //   expect(foo).toEqual(42)
//     //   done()
//     // }
//     if (foo === 42) done()
//     receiveCount++
//   }
//   // TODO wait for some event to do this
//   await pause(1500)
//   // change something in the local store
//   localStore.dispatch({ type: 'SET_FOO', payload: { value: 42 } })
// })
