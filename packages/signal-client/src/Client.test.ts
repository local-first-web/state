import debug from 'debug'
import { Client } from './Client'
import { Server } from 'cevitxe-signal-server'
import { Peer } from './Peer'

const kill = require('kill-port')
const port = 10001
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

    it('should connect to the discovery server', () => {
      client = new Client({ id: localId, url })
      expect(client.serverConnection.url).toContain('ws://localhost:10001/introduction/local')
    })
  })

  describe('Join', () => {
    let localClient: Client
    let remoteClient: Client

    it('should connect to a peer', async () => {
      localClient = new Client({ id: localId, url })
      remoteClient = new Client({ id: remoteId, url })

      localClient.join(key)
      remoteClient.join(key)

      await Promise.all([
        new Promise(resolve => {
          localClient.on('peer', peer => {
            expect(peer.id).toEqual(remoteId)
            resolve()
          })
        }),
        new Promise(resolve => {
          remoteClient.on('peer', peer => {
            expect(peer.id).toEqual(localId)
            resolve()
          })
        }),
      ])
    })
  })

  describe('Send/Receive', () => {
    let localClient: Client
    let remoteClient: Client

    it('should send a message to a remote peer', done => {
      localClient = new Client({ id: localId, url })
      remoteClient = new Client({ id: remoteId, url })

      localClient.join(key)
      remoteClient.join(key)

      localClient.on('peer', (peer: Peer) => {
        const connection = peer.get(key)
        connection.send('hello')
      })

      remoteClient.on('peer', (peer: Peer) => {
        const socket = peer.get(key)

        socket.on('message', message => {
          expect(message).toEqual('hello')
          done()
        })
      })
    })
  })
})
