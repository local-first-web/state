import { Server } from './Server'
import WebSocket from 'ws'

const docKey = 'test-123'

const port = 1234
const url = `ws://localhost:${port}`
const discoveryUrl = `${url}/discovery`
const connectUrl = `${url}/connect`

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

const join = (peerId: string, key: string) => {
  const peer = new WebSocket(`${discoveryUrl}/${peerId}`)
  const joinMessage = { type: 'Join', id: peerId, join: [key] }
  peer.on('open', () => peer.send(JSON.stringify(joinMessage)))
  return peer
}

describe('Server', () => {
  describe('Discovery', () => {
    it('should make a connection', done => {
      server.on('discoveryConnection', peerId => {
        expect(peerId).toEqual(localPeerId)
      })

      const localPeer = new WebSocket(`${discoveryUrl}/${localPeerId}`)
      localPeer.on('open', () => {
        expect(server.peers).toHaveProperty(localPeerId)
        expect(server.peerKeys).toEqual({})
        done()
      })
    })

    it('should join peers to document channels', done => {
      const localPeer = join(localPeerId, docKey)
      const remotePeer = join(remotePeerId, docKey)

      localPeer.on('message', d => {
        const message = JSON.parse(d.toString())
        expect(message.peerId).toEqual(remotePeerId)
        expect(message.peerId).toEqual(remotePeerId)
        done()
      })
    })
  })

  describe('Peer connections', () => {
    it('should pipe connections between two peers', done => {
      const localDiscoveryPeer = join(localPeerId, docKey)
      const remoteDiscoveryPeer = join(remotePeerId, docKey)

      localDiscoveryPeer.on('message', d => {
        const localPeer = new WebSocket(`${connectUrl}/${localPeerId}/${remotePeerId}/${docKey}`)
        const remotePeer = new WebSocket(`${connectUrl}/${remotePeerId}/${localPeerId}/${docKey}`)
        remotePeer.on('open', () => {
          remotePeer.send('hello')
        })
        localPeer.on('message', d => {
          expect(d).toEqual('hello')
        })

        localPeer.on('open', () => {
          localPeer.send('DUDE!!')
        })
        remotePeer.on('message', d => {
          expect(d).toEqual('DUDE!!')
          done()
        })
      })
    })
  })
})
