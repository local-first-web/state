import automerge from 'automerge'
import Peer from 'simple-peer'
import { automergify } from './automergify'
import { Connection } from './connection'
import { SingleDocSet } from './SingleDocSet'

jest.mock('simple-peer')

interface FooState {
  foo: number
  boo?: number
}

const FAKE_DISPATCH = <T>(s: T) => s

describe('Connection', () => {
  const defaultState: FooState = automergify({ foo: 1 })

  let docSet: SingleDocSet<FooState>

  beforeEach(() => {
    docSet = new SingleDocSet<FooState>(defaultState)
  })

  it('should expose its current state', () => {
    const peer = new Peer({})
    const connection = new Connection(docSet, peer, FAKE_DISPATCH)
    expect(connection.state).toEqual(defaultState)
  })

  it('should send messages to the peer when local state changes', () => {
    const peer = new Peer()
    const connection = new Connection(docSet, peer, FAKE_DISPATCH)

    const localDoc = docSet.get()
    const updatedDoc = automerge.change(localDoc, 'update', doc => (doc.boo = 2))
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
