import { Server } from './Server'
import WebSocket from 'ws'

const DOC1 = 'test-123'

const port = 1234
const url = `ws://localhost:${port}`

const localPeerId = 'local'
const remotePeerId = 'remote'

let server: Server

beforeEach(() => {
  server = new Server({ port })
  server.listen()
})

afterEach(() => {
  server.close()
})

describe('Server', () => {
  describe('Discovery', () => {
    const discoveryUrl = `${url}/discovery`

    it('should make a connection', done => {
      server.on('discoveryConnection', onDiscoveryConnection)

      const localPeer = new WebSocket(`${discoveryUrl}/${localPeerId}`)
      localPeer.on('open', onLocalPeerOpen)

      function onDiscoveryConnection(peerId: string) {
        expect(peerId).toEqual(localPeerId)
      }

      function onLocalPeerOpen() {
        expect(server.peers).toHaveProperty(localPeerId)
        expect(server.peerKeys).toEqual({})
        done()
      }
    })

    it('should join peers to document channels', done => {
      const localPeer = new WebSocket(`${discoveryUrl}/${localPeerId}`)
      const remotePeer = new WebSocket(`${discoveryUrl}/${remotePeerId}`)

      server.openDiscoveryConnection(localPeer, DOC1)
      server.openDiscoveryConnection(remotePeer, DOC1)

      const localJoinMessage = { type: 'Join', id: localPeerId, join: [DOC1] }
      const remoteJoinMessage = { type: 'Join', id: remotePeerId, join: [DOC1] }

      localPeer.on('open', () => localPeer.send(JSON.stringify(localJoinMessage)))
      remotePeer.on('open', () => remotePeer.send(JSON.stringify(remoteJoinMessage)))

      localPeer.once('message', msg => {
        expect(JSON.parse(msg.toString()).peerId).toEqual(remotePeerId)
        done()
      })
    })
  })
})
