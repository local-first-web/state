import A from 'automerge'
import { Server } from 'cevitxe-signal-server'
import { Connection } from './Connection'

import { WebSocket } from 'mock-socket'
import { newid } from 'cevitxe-signal-client'

// @ts-ignore
global.WebSocket = WebSocket

jest.mock('mock-socket')

interface FooState {
  foo: number
  boo?: number
}

const fakeDispatch = <T>(s: T) => s

const port = 10003
const url = `ws://localhost:${port}`

const localActorId = newid()

describe('Connection', () => {
  const initialState: FooState = A.change(A.init(localActorId), doc => (doc.foo = 1))

  let watchableDoc: A.WatchableDoc<A.Doc<FooState>>
  let server: Server

  beforeAll(async () => {
    server = new Server({ port })
    await server.listen({ silent: true })
  })

  beforeEach(() => {
    watchableDoc = new A.WatchableDoc<A.Doc<FooState>>(initialState)
  })

  afterAll(async () => {
    await server.close()
  })

  it('should expose its current state', () => {
    const peer = new WebSocket(url)
    const connection = new Connection(watchableDoc, peer, fakeDispatch)
    expect(connection.state).toEqual(initialState)
  })

  it('should send messages to the peer when local state changes', () => {
    const peer = new WebSocket(url)
    const connection = new Connection(watchableDoc, peer, fakeDispatch)
    expect(peer.send).toHaveBeenCalledWith(
      expect.stringContaining(JSON.stringify({ [localActorId]: 1 }))
    )
    expect(peer.send).not.toHaveBeenCalledWith(
      expect.stringContaining(JSON.stringify({ [localActorId]: 2 }))
    )

    const localDoc = watchableDoc.get()
    const updatedDoc = A.change(localDoc, 'update', doc => (doc.boo = 2))
    watchableDoc.set(updatedDoc)

    expect(connection.state.boo).toBe(2)
    expect(peer.send).toHaveBeenCalledWith(
      expect.stringContaining(JSON.stringify({ [localActorId]: 2 }))
    )
  })

  it('should call close on peer when close is called', () => {
    const peer = new WebSocket(url)
    const connection = new Connection(watchableDoc, peer, fakeDispatch)
    connection.close()
    expect(peer.close).toHaveBeenCalled()
  })
})
