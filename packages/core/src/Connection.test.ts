import eventPromise from 'p-event'
import A from 'automerge'
import { Repo } from './Repo'
import { Server } from 'cevitxe-signal-server'
import { newid } from 'cevitxe-signal-client'
import { Connection } from './Connection'

import { WebSocket } from 'mock-socket'
import { pause as _yield } from './pause'

// @ts-ignore adding object to global scope
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

  let repo: Repo<FooState>
  let server: Server

  beforeAll(async () => {
    server = new Server({ port })
    await server.listen({ silent: true })
  })

  beforeEach(async () => {
    repo = new Repo<any>('test', `test${newid()}`, localActorId)
    await repo.open()
    let key: keyof FooStateDoc
    for (key in initialState) {
      const value = initialState[key]
      repo.set(key, A.from(value, localActorId))
    }
  })

  afterAll(async () => {
    await server.close()
  })

  it('should send messages to the peer when local state changes', async () => {
    const peer = new WebSocket(url)
    const connection = new Connection(repo, peer, fakeDispatch)

    await eventPromise(connection, 'ready')
    await _yield()

    expect(peer.send).toHaveBeenCalledWith(
      expect.stringContaining(JSON.stringify({ [localActorId]: 1 }))
    )

    expect(peer.send).not.toHaveBeenCalledWith(
      expect.stringContaining(JSON.stringify({ [localActorId]: 2 }))
    )

    await repo.change('state', s => (s.boo = 2))
    await _yield()

    expect(peer.send).toHaveBeenCalledWith(
      expect.stringContaining(JSON.stringify({ [localActorId]: 2 }))
    )
  })

  it('should call close on peer when close is called', () => {
    const peer = new WebSocket(url)
    const connection = new Connection(repo, peer, fakeDispatch)
    connection.close()
    expect(peer.close).toHaveBeenCalled()
  })
})
