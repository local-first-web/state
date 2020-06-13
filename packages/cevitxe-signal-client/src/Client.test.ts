import { Server } from 'cevitxe-signal-server'
import debug from 'debug'
import { getPortPromise as getAvailablePort } from 'portfinder'
import { Client } from './Client'
import { Peer } from './Peer'
import { ConnectionEvent } from 'cevitxe-types'

const { PEER } = ConnectionEvent

describe('Client', () => {
  const log = debug('cevitxe:signal-client:tests')
  let port: number
  let url: string

  let server: Server
  let key: string
  let testId: number = 0
  let localId: string
  let remoteId: string

  beforeAll(async () => {
    // find a port and set things up
    port = await getAvailablePort({ port: 3000 })
    url = `ws://localhost:${port}`

    server = new Server({ port })
    await server.listen({ silent: true })
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
  })

  describe('Initialization', () => {
    let client: Client

    it('should connect to the discovery server', () => {
      client = new Client({ id: localId, url })
      expect(client.serverConnection.url).toContain(`ws://localhost:${port}/introduction/local`)
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
          localClient.on(PEER, peer => {
            expect(peer.id).toEqual(remoteId)
            resolve()
          })
        }),
        new Promise(resolve => {
          remoteClient.on(PEER, peer => {
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

      localClient.on(PEER, (peer: Peer) => {
        const connection = peer.get(key)
        connection.send('hello')
      })

      remoteClient.on(PEER, (peer: Peer) => {
        const socket = peer.get(key)

        socket.onmessage = ({ data }) => {
          expect(data).toEqual('hello')
          done()
        }
      })
    })
  })
})
