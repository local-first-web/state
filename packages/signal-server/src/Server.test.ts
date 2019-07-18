import { debug } from 'debug-deluxe'
import WebSocket from 'ws'
import { Server } from './Server'

const kill = require('kill-port')
const port = 1234
const url = `ws://localhost:${port}`
const introductionUrl = `${url}/introduction`
const connectUrl = `${url}/connect`

const log = debug('cevitxe:signal-server:tests')
const _log = console.log

describe('Server', () => {
  let server: Server
  let localId: string
  let remoteId: string
  let key: string
  let testId: number = 0

  beforeAll(async () => {
    // prevent server from logging 'listening on port...' during tests
    console.log = () => {}
    await kill(port, 'tcp') // kill anything that's still listening on our port (e.g. previous test run didn't end cleanly)
    server = new Server({ port })
    server.listen()
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

  const makeIntroductionRequest = (id: string, key: string) => {
    const peer = new WebSocket(`${introductionUrl}/${id}`)
    const joinMessage = { type: 'Join', id: id, join: [key] }
    peer.once('open', () => peer.send(JSON.stringify(joinMessage)))
    return peer
  }

  describe('Introduction', () => {
    it('should make a connection', done => {
      expect.assertions(3)

      server.once('introductionConnection', id => {
        expect(id).toEqual(localId)
      })

      const localPeer = new WebSocket(`${introductionUrl}/${localId}`)

      localPeer.once('open', () => {
        expect(server.peers).toHaveProperty(localId)
        expect(server.keys).toEqual({})
        done()
      })
    })

    it('should invite peers to connect', async () => {
      expect.assertions(4)

      const localPeer = makeIntroductionRequest(localId, key)
      const remotePeer = makeIntroductionRequest(remoteId, key) // need to make request even if we don't use the result

      const localDone = new Promise(resolve => {
        localPeer.once('message', d => {
          const invitation = JSON.parse(d.toString())
          expect(invitation.id).toEqual(remoteId)
          expect(invitation.keys).toEqual([key])
          resolve()
        })
      })
      const remoteDone = new Promise(resolve => {
        remotePeer.once('message', d => {
          const invitation = JSON.parse(d.toString())
          expect(invitation.id).toEqual(localId)
          expect(invitation.keys).toEqual([key])
          resolve()
        })
      })
      await Promise.all([localDone, remoteDone])
    })
  })

  describe('Peer connections', () => {
    it('should pipe connections between two peers', done => {
      expect.assertions(4)

      const localIntroductionPeer = makeIntroductionRequest(localId, key)
      const remoteIntroductionPeer = makeIntroductionRequest(remoteId, key) // need to make request even if we don't use the result

      localIntroductionPeer.once('message', d => {
        // recap of previous test: we'll get an invitation to connect to the remote peer
        const invitation = JSON.parse(d.toString())

        expect(invitation.id).toEqual(remoteId)
        expect(invitation.keys).toEqual([key])

        const localPeer = new WebSocket(`${connectUrl}/${localId}/${remoteId}/${key}`)
        const remotePeer = new WebSocket(`${connectUrl}/${remoteId}/${localId}/${key}`)

        // send message from local to remote
        localPeer.once('open', () => localPeer.send('DUDE!!'))
        remotePeer.once('message', d => {
          console.log('remotePeer_message')
          expect(d).toEqual('DUDE!!')
        })

        // send message from remote to local
        remotePeer.once('open', () => remotePeer.send('hello'))
        localPeer.once('message', d => {
          console.log('localPeer_message')
          expect(d).toEqual('hello')
          done()
        })
      })
    })
  })
  describe('N-way', () => {
    it('Should make introductions between all the peers', done => {
      const instances = ['a', 'b', 'c', 'd', 'e']
      const expectedInvitations = factorial(instances.length) / factorial(instances.length - 2) // Permutations of 2
      expect.assertions(expectedInvitations)
      const ids = instances.map(id => `peer-${id}-${testId}`)
      const introductionPeers = ids.map(d => makeIntroductionRequest(d, key))
      let invitations = 0
      introductionPeers.forEach(introductionPeer => {
        introductionPeer.on('message', invitationMessage => {
          const invitation = JSON.parse(invitationMessage.toString())
          expect(invitation.type).toBe('Connect')
          invitations++
          if (invitations === expectedInvitations) done()
        })
      })
    })
  })
})

const factorial = (n: number): number => (n === 1 ? 1 : n * factorial(n - 1))
