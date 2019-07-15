import { Server } from './Server'
import WebSocket from 'ws'

const DOC1 = 'test-123'

const port = 1234
const url = `ws://localhost:${port}`

const localPeerId = 'local'
const remotePeerId = 'remote'

let server: Server | undefined

beforeEach(async () => {
  server = new Server({ port })
  await server.listen()
})

afterEach(() => {
  if (server) {
    server.close()
    server = undefined
  }
})

describe('Server', () => {
  describe('Discovery', () => {
    it('should make a connection', done => {
      const server = new Server()

      server.on('discoveryConnection', () => {
        expect(server.peers).toHaveProperty(DOC1)
        done()
      })

      const localPeer = new WebSocket(`${url}/discovery/${localPeerId}`)
    })

    // it('should join peers to document channels', () => {
    //   const server = new Server()
    //   const localPeer = new WebSocket(url)
    //   const remotePeer = new WebSocket(url)

    //   localPeer.on('message', msg => {
    //     console.log(msg)
    //   })

    //   server.openDiscoveryConnection(localPeer, DOC1)
    //   server.openDiscoveryConnection(remotePeer, DOC1)

    //   const localJoinMessage = { type: 'Join', id: localPeerId, join: [DOC1] }
    //   server.receiveDiscoveryMessage(DOC1)(JSON.stringify(localJoinMessage))
    //   expect(server.peerKeys).toEqual({ [localPeerId]: [DOC1] })

    //   const remoteJoinMessage = { type: 'Join', id: remotePeerId, join: [DOC1] }
    //   server.receiveDiscoveryMessage(DOC1)(JSON.stringify(remoteJoinMessage))
    //   expect(server.peerKeys).toEqual({ [localPeerId]: [DOC1], [remotePeerId]: [DOC1] })
    // })
  })
})
