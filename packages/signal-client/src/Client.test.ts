import { debug } from 'debug-deluxe'
import { Client } from './Client'
import { Duplex, Writable, Transform } from 'stream'
import { Server } from 'cevitxe-signal-server'
import { Peer } from './Peer'

const kill = require('kill-port')
const port = 1234
const url = `ws://localhost:${port}`

describe('Client', () => {
  const log = debug('cevitxe:signal-client:tests')
  const _log = console.log

  let server: Server
  let key: string
  let testId: number = 0
  let localId: string
  let remoteId: string

  beforeAll(async () => {
    // prevent server from logging 'listening on port...' during tests
    console.log = () => {}

    await kill(port, 'tcp') // kill anything that's still listening on our port (e.g. previous test run didn't end cleanly)
    server = new Server({ port })
    await server.listen()
  })

  beforeEach(() => {
    testId += 1
    localId = `local-${testId}`
    remoteId = `remote-${testId}`
    key = `test-key-${testId}`
    log(`TEST ${testId}`)
  })

  afterEach(() => {})

  afterAll(() => {
    server.close()
    console.log = _log
  })

  describe('Initialization', () => {
    let client: Client

    beforeEach(() => {
      const stream = () => new Duplex()
      client = new Client({ id: localId, url, stream })
    })

    it('have the right id', () => {
      expect(client.id).toEqual(localId)
    })

    it('should connect to the discovery server', () => {
      expect(client.serverConnection.url).toEqual(`ws://localhost:1234/introduction/local-2`)
    })
  })

  describe('Join', () => {
    let localClient: Client
    let remoteClient: Client

    beforeEach(() => {
      const stream = () => new Duplex()
      localClient = new Client({ id: localId, url, stream })
      remoteClient = new Client({ id: remoteId, url, stream })
    })

    it('should connect to a peer', done => {
      localClient.join(key)
      remoteClient.join(key)

      localClient.on('peer', peer => {
        expect(peer.id).toEqual(remoteId)
        done()
      })
    })
  })

  describe('Send/Receive', () => {
    let localClient: Client
    let remoteClient: Client

    beforeEach(() => {})

    it('should send a message peer', done => {
      const stream = () =>
        new Transform({
          objectMode: true,
          transform(chunk, encoding, callback) {
            // Transform the chunk into something else.
            const data = chunk.toString()

            // Push the data onto the readable queue.
            callback(null, data)
          },
        })

      localClient = new Client({ id: localId, url, stream })
      remoteClient = new Client({ id: remoteId, url, stream })

      localClient.join(key)
      remoteClient.join(key)

      localClient.on('peer', (peer: Peer) => {
        console.log(peer.keys)
        const connection = peer.keys.get(key)
        connection.write('hello')
      })

      remoteClient.on('peer', (peer: Peer) => {
        const connection = peer.keys.get(key)

        connection.on('message', message => {
          expect(message).toEqual('hello')
          done()
        })
      })
    })
  })
})
