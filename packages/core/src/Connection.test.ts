import A from 'automerge'
import { DocSet } from './lib/automerge'
import { Server } from 'cevitxe-signal-server'
import { newid } from 'cevitxe-signal-client'
import { Connection } from './Connection'

import { WebSocket } from 'mock-socket'

// @ts-ignore
global.WebSocket = WebSocket

jest.mock('mock-socket')

interface FooState {
  foo: number
  boo?: number
}

interface FooStateDoc {
  state: FooState
}

const fakeDispatch = <T>(s: T) => s

const port = 10003
const url = `ws://localhost:${port}`
const localActorId = newid()

describe('Connection', () => {
  const initialState: FooStateDoc = { state: { foo: 1 } }

  let docSet: DocSet<FooState>
  let server: Server

  beforeAll(async () => {
    server = new Server({ port })
    await server.listen({ silent: true })
  })

  beforeEach(() => {
    docSet = new DocSet<any>()
    let key: keyof FooStateDoc
    for (key in initialState) {
      const value = initialState[key]
      // docSet.setDoc(key, A.change(A.init(localActorId), s => value))
      docSet.setDoc(key, A.from(value, localActorId))
    }
  })

  afterAll(async () => {
    await server.close()
  })

  it('should expose its current state', () => {
    const peer = new WebSocket(url)
    const connection = new Connection(docSet, peer, fakeDispatch)
    expect(connection.state).toEqual(initialState)
  })

  it('should send messages to the peer when local state changes', () => {
    const peer = new WebSocket(url)
    const connection = new Connection(docSet, peer, fakeDispatch)
    expect(peer.send).toHaveBeenCalledWith(
      expect.stringContaining(JSON.stringify({ [localActorId]: 1 }))
    )
    expect(peer.send).not.toHaveBeenCalledWith(
      expect.stringContaining(JSON.stringify({ [localActorId]: 2 }))
    )

    const localDoc = docSet.getDoc('state')
    const updatedDoc = A.change<FooState>(localDoc, 'update', doc => (doc.boo = 2))
    docSet.setDoc('state', updatedDoc)

    expect(connection.state.state.boo).toBe(2)
    expect(peer.send).toHaveBeenCalledWith(
      expect.stringContaining(JSON.stringify({ [localActorId]: 2 }))
    )
  })

  it('should call close on peer when close is called', () => {
    const peer = new WebSocket(url)
    const connection = new Connection(docSet, peer, fakeDispatch)
    connection.close()
    expect(peer.close).toHaveBeenCalled()
  })
})
