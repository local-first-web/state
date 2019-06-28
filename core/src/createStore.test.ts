require('fake-indexeddb/auto')
const wrtc = require('wrtc')

import * as Redux from 'redux'
import { createStore, getDbName } from './createStore'
import webrtcSwarm from 'webrtc-swarm'
import { ProxyReducer } from './types'
import { cleanup } from 'signalhub'
import { deleteDB } from 'idb'
import debug from 'debug'
import hypercoreCrypto from 'hypercore-crypto'

const log = debug('cevitxe:createStoreTests')

jest.mock('webrtc-swarm')
jest.mock('signalhub')

let discoveryKey = '922e233117982b2fddaed3ad6adf8fc7bde6b4d8d8802a67663fdedbfedf00ea'

const needlessPromise = () => new Promise(resolve => setTimeout(() => resolve(), 100))

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

describe('createStore', () => {
  let store: Redux.Store

  beforeEach(async () => {
    log('beforeEach')
    discoveryKey = hypercoreCrypto.keyPair().publicKey.toString('hex')
    const defaultState: FooState = { foo: 1 }
    store = await createStore({ discoveryKey, proxyReducer, defaultState })
  })

  afterEach(() => {
    log('afterEach')
    cleanup()
  })

  it('should use the reducer we gave it', () => {
    store.dispatch({ type: 'SET_FOO', payload: { value: 3 } })
    const doc = store.getState()
    expect(doc.foo).toEqual(3)
  })

  it('should return something that looks like a store', () => {
    expect(store).toHaveProperty('getState')
    expect(store).toHaveProperty('dispatch')
    expect(store).toHaveProperty('subscribe')
  })

  /*
Notes:

I can get parallel tests to pass by creating a new discovery key in beforeEach. 
This still falls down when creating multiple stores in the same test because 
they share a feed DB (due to how we name them)

To combat the shared feed DB in the same test I'm passing a different databaseName for the remote store, 
which gets them properly created with expected initial states but the peers aren't sending data, investigating now.

If I comment out `await feedReady` in createStore, the peers start talking properly. I'm gonna see if increasing the jest timeout for this test helps.
No dice on that, increasing to even 20s doesn't get anything finished.

I added a dummy promise function and awaited it in body of createStore and it does the same thing that awaiting feedReady does. 
At least this means it's nothing particular to the hypercore feed we're awaiting.
Must need a different tactic to make createStore async/awaitable for tests with the connections
Dummy promise method:
const needlessPromise = () => new Promise(resolve => setTimeout(() => resolve(), 100))
await needlessPromise()

I tried wrapping the whole body of `createStore` in a new promise and only resolving it when we're ready to return the store.
This didn't help anything and just added more nesting to things. le sigh....

More rubber ducking here:
So when we're awaiting anything async in createStore our test shows that both stores get created and join the swarm.
Only one of the 2 peers signals the other though, which is where things fall down and the peers don't talk.
What is it about awaiting that makes the peers not fully connect?
Only the first peer is set as initiator. Things should be connecting properly, if we comment out the awaited line in createStore the peers connect and talk.
Is there a thread switch or something caused by the await that pushes our peers out of sync? Why only one though?

I tried adding some await stuff to the `connection (live)` test in simplePeer.test.ts but 
it always seemed to work unless I put obviously wrong async stuff in there.

I thought I found something sort of useful with a `flushPromises` method as found in a SO answer: https://stackoverflow.com/a/51045733/155355
`const flushPromises = () => new Promise(setImmediate)`
But that didn't seem to help us out in the createStore test. My suspicion from looking at their example is 
that you stop awaiting you call and await flushPromises instead, which doesn't help us with an internal await call we can't touch

It seems to be something about awaiting in the setup of things and not awaits within the test itself.

TODO after we get this sorted out:
- Do we need idb? Did we end up removing any dbs from fake-indexeddb?
- Can we get rid of `getDbName` if we're not manually touching fake DBs?


*/
  it.only('should communicate changes from one store to another', async done => {
    // instantiate remote store
    const onReceive = (message: any) => {
      expect(remoteStore.getState().foo).toEqual(42)
      done()
    }

    const remoteStore = await createStore({
      discoveryKey,
      proxyReducer,
      onReceive,
      databaseName: 'remote-store',
    })

    // This is commented out so we get a failing test even if the peers are talking. No false positives here!
    // change something in the local store
    //store.dispatch({ type: 'SET_FOO', payload: { value: 42 } })
  })
})
