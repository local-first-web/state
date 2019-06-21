import automerge from 'automerge'
import { Connection } from './connection'
import { automergify } from './automergify'

interface FooState {
  foo: string
  boo?: string
}

describe('Connection', () => {
  const defaultState: FooState = automergify({ foo: 'hello world' })

  let connection: Connection

  beforeEach(() => {
    connection = new Connection(defaultState)
  })

  it('should expose its current state', () => {
    expect(connection.state).toEqual(defaultState)
  })

  it('should apply changes to documents', () => {
    const updatedDoc = automerge.change(connection.state, 'update', doc => {
      doc.boo = 'new boo'
    })
    const changes = automerge.getChanges(connection.state, updatedDoc)
    const message = { clock: updatedDoc.map, changes } as automerge.Message<any>
    connection.receive(message)
    expect(connection.state.boo).toBe('new boo')
  })

  it('should write messages to the peer', done => {
    const newValue = 'new boo'
    let peerWrite = (data: Buffer | Uint8Array | string) => {
      const message = JSON.parse(data.toString())
      expect(message.changes[0].ops[0].value).toBe(newValue)
      done()
    }
    const peer = createMockPeer({ onWrite: peerWrite }) as NodeJS.ReadWriteStream
    connection = new Connection(defaultState, peer)

    const updatedDoc = automerge.change(connection.state, 'update', doc => {
      doc.boo = newValue
    })
    const changes = automerge.getChanges(connection.state, updatedDoc)
    const message = { clock: updatedDoc.map, changes } as automerge.Message<any>
    connection.send(message)
  })

  it('should call end on peer when close is called', done => {
    const peerEnd = () => {
      done()
    }
    const peer = createMockPeer({ onEnd: peerEnd }) as NodeJS.ReadWriteStream
    connection = new Connection(defaultState, peer)
    connection.close()
  })
})

const createMockPeer = ({
  onWrite = (_: Buffer | Uint8Array | string) => {},
  onEnd = () => {},
}) => ({
  end: () => {
    onEnd()
  },
  write: (buffer: Buffer | Uint8Array | string, cb?: (err?: Error | null) => void): boolean => {
    onWrite(buffer)
    return true
  },
})
