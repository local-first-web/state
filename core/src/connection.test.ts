import automerge from 'automerge'
import { Connection } from './connection'
import { automergify } from './automergify'
import { DOC_ID } from './constants'
import Peer from 'simple-peer'

jest.mock('simple-peer')

interface FooState {
  foo: number
  boo?: number
}

describe('Connection', () => {
  const defaultState: FooState = automergify({ foo: 1 })

  let docSet: automerge.DocSet<FooState>

  beforeEach(() => {
    docSet = new automerge.DocSet<FooState>()
    docSet.setDoc(DOC_ID, defaultState)
  })

  it('should expose its current state', () => {
    const peer = new Peer({})
    const connection = new Connection(docSet, peer)
    expect(connection.state).toEqual(defaultState)
  })

  it('should send messages to the peer when local state changes', () => {
    const peer = new Peer()
    const connection = new Connection(docSet, peer)

    const localDoc = docSet.getDoc(DOC_ID)
    const updatedDoc = automerge.change(localDoc, 'update', doc => (doc.boo = 2))
    docSet.setDoc(DOC_ID, updatedDoc)

    expect(connection.state.boo).toBe(2)

    expect(peer.send).toHaveBeenCalled()
  })

  it('should call end on peer when close is called', () => {
    const peer = new Peer()
    const connection = new Connection(docSet, peer)
    connection.close()
    expect(peer.destroy).toHaveBeenCalled()
  })
})
