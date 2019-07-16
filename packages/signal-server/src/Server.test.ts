import { Server } from './Server'
import WebSocket from 'ws'

const port = 1234
const url = `ws://localhost:${port}`
const introductionUrl = `${url}/introduction`
const connectUrl = `${url}/connect`

const _log = console.log

describe('Server', () => {
  let server: Server
  let localId: string
  let remoteId: string
  let key: string
  let testId: number = 0

  beforeAll(() => {
    // prevent server from logging 'listening on port...' during tests
    console.log = () => {}
    server = new Server({ port })
    server.listen()
  })

  beforeEach(() => {
    testId += 1
    localId = `local-${testId}`
    remoteId = `remote-${testId}`
    key = `test-key-${testId}`
  })

  afterEach(() => {})

  afterAll(() => {
    server.close()
    console.log = _log
  })

  describe('Introduction', () => {
    it('should count assertions correctly', done => {
      const peer = new WebSocket(`${introductionUrl}/${localId}`)
      expect.assertions(3)
      expect(1 + 1).toEqual(2)
      expect(1 + 1).not.toEqual(3)
      peer.on('open', () => {
        expect(2 ** 3).toEqual(8)
        done()
      })
    })

    it('should make a connection', done => {
      expect.assertions(3)

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
      const makeIntroductionRequest = (id: string, key: string) => {
        const peer = new WebSocket(`${introductionUrl}/${id}`)
        const joinMessage = { type: 'Join', id: id, join: [key] }
        peer.on('open', () => peer.send(JSON.stringify(joinMessage)))
        return peer
      }

      const localPeer = makeIntroductionRequest(localId, key)
      const remotePeer = makeIntroductionRequest(remoteId, key) // need to make request even if we don't use the result

      localPeer.on('message', d => {
        const invitation = JSON.parse(d.toString())
        expect(invitation.id).toEqual(remoteId)
        expect(invitation.keys).toEqual([key])
        done()
      })
    })
  })

  describe('Peer connections', () => {
    it('should pipe connections between two peers', done => {
      const makeIntroductionRequest = (id: string, key: string) => {
        const peer = new WebSocket(`${introductionUrl}/${id}`)
        const joinMessage = { type: 'Join', id: id, join: [key] }
        peer.on('open', () => peer.send(JSON.stringify(joinMessage)))
        return peer
      }

      // expect.assertions(4)
      const localIntroductionPeer = makeIntroductionRequest(localId, key)
      const remoteIntroductionPeer = makeIntroductionRequest(remoteId, key) // need to make request even if we don't use the result

      localIntroductionPeer.on('message', d => {
        // recap of previous test: we'll get an invitation to connect to the remote peer
        const invitation = JSON.parse(d.toString())
        expect(invitation.id).toEqual(remoteId)
        expect(invitation.keys).toEqual([key])

        const localPeer = new WebSocket(`${connectUrl}/${localId}/${remoteId}/${key}`)
        const remotePeer = new WebSocket(`${connectUrl}/${remoteId}/${localId}/${key}`)

        // send message from remote to local
        remotePeer.on('open', () => remotePeer.send('hello'))
        localPeer.on('message', d => {
          expect(d).toEqual('hello')
          done()
        })

        // send message from local to remote
        localPeer.on('open', () => localPeer.send('DUDE!!'))
        remotePeer.on('message', d => {
          expect(d).toEqual('DUDE!!')
        })
      })
    })
  })
})
