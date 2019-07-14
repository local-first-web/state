import A from 'automerge'
import Peer from 'simple-peer'

import { Connection } from './Connection'
import { SingleDocSet } from './SingleDocSet'

jest.mock('simple-peer')

interface FooState {
  foo: number
  boo?: number
}

const FAKE_DISPATCH = <T>(s: T) => s

describe('Connection', () => {
  const initialState: FooState = A.from({ foo: 1 })

  let docSet: SingleDocSet<FooState>

  beforeEach(() => {
    docSet = new SingleDocSet<FooState>(initialState)
  })

  it('should expose its current state', () => {
    const peer = new Peer({})
    const connection = new Connection(docSet, peer, FAKE_DISPATCH)
    expect(connection.state).toEqual(initialState)
  })

  it('should send messages to the peer when local state changes', () => {
    const peer = new Peer()
    const connection = new Connection(docSet, peer, FAKE_DISPATCH)

    const localDoc = docSet.get()
    const updatedDoc = A.change(localDoc, 'update', doc => (doc.boo = 2))
    docSet.set(updatedDoc)

    expect(connection.state.boo).toBe(2)

    expect(peer.send).toHaveBeenCalled()
  })

  it('should call end on peer when close is called', () => {
    const peer = new Peer()
    const connection = new Connection(docSet, peer, FAKE_DISPATCH)
    connection.close()
    expect(peer.destroy).toHaveBeenCalled()
  })
})
