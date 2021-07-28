import A from 'automerge'
import { Repo } from './Repo'
import { Server } from '@localfirst/relay'
import { newid } from '@localfirst/relay-client'
import * as Auth from '@philschatz/auth'
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

  const user = Auth.createUser({
    userName: 'Alice',
    deviceName: 'Laptop',
    deviceType: 1
  })
  const team = Auth.createTeam('dream', {user})

  beforeAll(async () => {
    server = new Server({ port })
    await server.listen({ silent: true })
  })

  beforeEach(async () => {
    repo = new Repo<any>({
      discoveryKey: 'test',
      databaseName: `test${newid()}`,
      clientId: localActorId,
    })
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
    const _ = new Connection(team, repo, peer, fakeDispatch)
    await _yield()

    expect(peer.send).toHaveBeenCalled()

    await repo.change('state', s => (s.boo = 2))
    await _yield()

    expect(peer.send).toHaveBeenCalled()
  })

  it('should call close on peer when close is called', () => {
    const peer = new WebSocket(url)
    const connection = new Connection(team, repo, peer, fakeDispatch)
    connection.close()
    expect(peer.close).toHaveBeenCalled()
  })
})
