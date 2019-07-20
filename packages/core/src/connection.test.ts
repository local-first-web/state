import A from 'automerge'

import { Connection } from './Connection'
import { SingleDocSet } from './SingleDocSet'
import WebSocket from 'ws'
import { Server } from 'cevitxe-signal-server'

jest.mock('ws')

interface FooState {
  foo: number
  boo?: number
}

const fakeDispatch = <T>(s: T) => s

const port = 10003
const url = `http://localhost:${port}`

describe('Connection', () => {
  const initialState: FooState = A.from({ foo: 1 })
  let docSet: SingleDocSet<FooState>
  let server

  beforeAll(async () => {
    server = new Server({ port })
    await server.listen({ silent: true })
  })

  beforeEach(() => {
    docSet = new SingleDocSet<FooState>(initialState)
  })

  it('should expose its current state', () => {
    const peer = new WebSocket(url)
    const connection = new Connection(docSet, peer, fakeDispatch)
    expect(connection.state).toEqual(initialState)
  })

  it('should send messages to the peer when local state changes', () => {
    const peer = new WebSocket(url)
    const connection = new Connection(docSet, peer, fakeDispatch)

    const localDoc = docSet.get()
    const updatedDoc = A.change(localDoc, 'update', doc => (doc.boo = 2))
    docSet.set(updatedDoc)

    expect(connection.state.boo).toBe(2)

    expect(peer.send).toHaveBeenCalled()
  })

  it('should call end on peer when close is called', () => {
    const peer = new WebSocket(url)
    const connection = new Connection(docSet, peer, fakeDispatch)
    connection.close()
    expect(peer.close).toHaveBeenCalled()
  })
})
