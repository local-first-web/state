import Peer from 'simple-peer'
import A from 'automerge'

import { SingleDocSet } from './SingleDocSet'
import { Connection } from './connection'

const wrtc = require('wrtc')
let localPeer: Peer.Instance
let remotePeer: Peer.Instance

beforeEach(() => {
  localPeer = new Peer({ wrtc, initiator: true })
  remotePeer = new Peer({ wrtc })
  localPeer.on('signal', data => remotePeer.signal(data))
  remotePeer.on('signal', data => localPeer.signal(data))
})

afterEach(() => {
  localPeer.destroy()
  remotePeer.destroy()
})

describe('simple-peer', () => {
  test('simple-peer example from readme', done => {
    localPeer.on('connect', () => {
      // wait for 'connect' event before using the data channel
      localPeer.send('hey peer2, how is it going?')
    })

    remotePeer.on('data', data => {
      // got a data channel message
      expect(data.toString()).toEqual('hey peer2, how is it going?')
      done()
    })
  })
})

// Don't need this once we have e2e tests on createStore

describe('connection (live)', () => {
  interface FooState {
    foo?: number
    boo?: number
  }

  const defaultState: FooState = A.from({ foo: 1 })

  let localDocSet: SingleDocSet<FooState>

  beforeEach(() => {
    localDocSet = new SingleDocSet<FooState>(defaultState)
  })

  it.skip('communicates local changes to remote peer', done => {
    const remoteDocSet = new SingleDocSet<FooState>(A.from({}))

    localPeer.on('connect', () => new Connection<FooState>(localDocSet, localPeer))
    remotePeer.on('connect', () => new Connection<FooState>(remoteDocSet, remotePeer))

    const localDoc = localDocSet.get()
    const updatedDoc = A.change(localDoc, 'update', doc => (doc.boo = 2))

    localDocSet.set(updatedDoc)

    remoteDocSet.base.registerHandler((_, remoteDoc) => {
      expect(remoteDoc.boo).toEqual(2)
      done()
    })
  })
})
