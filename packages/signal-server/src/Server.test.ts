import { Server } from './Server'
import WebSocket from 'ws'

const key = 'test-123'

const port = 1234
const url = `ws://localhost:${port}`
const introductionUrl = `${url}/introduction`
const connectUrl = `${url}/connect`

const localId = 'local'
const remoteId = 'remote'

// prevent server from logging 'listening on port...' during tests
const _log = console.log
console.log = () => {}

let server: Server

beforeEach(() => {
  server = new Server({ port })
  server.listen()
})

afterEach(() => {
  server.close()
})

describe('Server', () => {
  const makeIntroductionRequest = (id: string, key: string) => {
    const peer = new WebSocket(`${introductionUrl}/${id}`)
    const joinMessage = { type: 'Join', id: id, join: [key] }
    peer.on('open', () => peer.send(JSON.stringify(joinMessage)))
    return peer
  }

  describe('Introduction', () => {
    it('should make a connection', done => {
      server.on('introductionConnection', id => {
        expect(id).toEqual(localId)
      })

      const localPeer = new WebSocket(`${introductionUrl}/${localId}`)
      localPeer.on('open', () => {
        expect(server.peers).toHaveProperty(localId)
        expect(server.keys).toEqual({})
        done()
      })
    })

    it('should invite peers to connect', done => {
      const localPeer = makeIntroductionRequest(localId, key)
      const remotePeer = makeIntroductionRequest(remoteId, key)

      localPeer.on('message', d => {
        const message = JSON.parse(d.toString())
        expect(message.id).toEqual(remoteId)
        expect(message.keys).toEqual([key])
        done()
      })
    })
  })

  describe('Peer connections', () => {
    it('should pipe connections between two peers', done => {
      const localIntroductionPeer = makeIntroductionRequest(localId, key)
      const remoteIntroductionPeer = makeIntroductionRequest(remoteId, key) // need to make request even if we don't use the result

      localIntroductionPeer.on('message', d => {
        // once we receive a message from the , we know
        const localPeer = new WebSocket(`${connectUrl}/${localId}/${remoteId}/${key}`)
        const remotePeer = new WebSocket(`${connectUrl}/${remoteId}/${localId}/${key}`)
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

afterAll(() => {
  console.log = _log
})
