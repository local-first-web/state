import Peer from 'simple-peer'

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
  test('single-page example from readme', done => {
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

// describe('connection (live)', () => {
//   interface FooState {
//     foo?: number
//     boo?: number
//   }

//   const defaultState: FooState = automergify({ foo: 1 })

//   let localDocSet: SingleDocSet<FooState>
//   const makeDispatch = (docSet: SingleDocSet<FooState>): Dispatch<AnyAction> => ({
//     type,
//     payload,
//   }) => {
//     return {}
//   }

//   beforeEach(() => {
//     localDocSet = new SingleDocSet<FooState>(defaultState)
//   })

//   it('communicates local changes to remote peer', done => {
//     const remoteDocSet = new SingleDocSet<FooState>(automergify({}))

//     localPeer.on('connect', () => new Connection<FooState>(localDocSet, localPeer, makeDispatch(localDocSet)))

//     remotePeer.on(
//       'connect',
//       () => new Connection<FooState>(remoteDocSet, remotePeer, makeDispatch(localDocSet))
//     )

//     const localDoc = localDocSet.get()
//     const updatedDoc = automerge.change(localDoc, 'update', doc => (doc.boo = 2))

//     localDocSet.set(updatedDoc)

//     remoteDocSet.base.registerHandler((_, remoteDoc) => {
//       expect(remoteDoc.boo).toEqual(2)
//       done()
//     })
//   })
// })
