import debug from 'debug'
import WebSocket from 'ws'
import { Server } from './Server'
import { getPortPromise as getAvailablePort } from 'portfinder'
import { ConnectionEvent } from 'cevitxe-types'

const log = debug('cevitxe:signal-server:tests')
const { MESSAGE, OPEN } = ConnectionEvent

describe('Server', () => {
  let port: number
  let url: string
  let introductionUrl: string
  let connectionUrl: string

  let server: Server
  let localId: string
  let remoteId: string
  let key: string
  let testId: number = 0

  beforeAll(async () => {
    // find a port and set things up
    port = await getAvailablePort({ port: 3100 })
    url = `ws://localhost:${port}`
    introductionUrl = `${url}/introduction`
    connectionUrl = `${url}/connection`

    server = new Server({ port })
    server.listen({ silent: true })
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

  const makeIntroductionRequest = (id: string, key: string) => {
    const peer = new WebSocket(`${introductionUrl}/${id}`)
    const joinMessage = { type: 'Join', id: id, join: [key] }
    peer.once(OPEN, () => peer.send(JSON.stringify(joinMessage)))
    return peer
  }

  describe('Introduction', () => {
    it('should make a connection', done => {
      expect.assertions(3)

      server.once('introductionConnection', id => {
        expect(id).toEqual(localId)
      })

      const localPeer = new WebSocket(`${introductionUrl}/${localId}`)

      localPeer.once(OPEN, () => {
        expect(server.peers).toHaveProperty(localId)
        expect(server.keys).toEqual({})
        done()
      })
    })

    it('should invite peers to connect', async () => {
      expect.assertions(4)

      const localPeer = makeIntroductionRequest(localId, key)
      const remotePeer = makeIntroductionRequest(remoteId, key)

      const localDone = new Promise(resolve => {
        localPeer.once(MESSAGE, d => {
          const invitation = JSON.parse(d.toString())
          expect(invitation.id).toEqual(remoteId)
          expect(invitation.keys).toEqual([key])
          resolve()
        })
      })
      const remoteDone = new Promise(resolve => {
        remotePeer.once(MESSAGE, d => {
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

      localIntroductionPeer.once(MESSAGE, d => {
        // recap of previous test: we'll get an invitation to connect to the remote peer
        const invitation = JSON.parse(d.toString())

        expect(invitation.id).toEqual(remoteId)
        expect(invitation.keys).toEqual([key])

        const localPeer = new WebSocket(`${connectionUrl}/${localId}/${remoteId}/${key}`)
        const remotePeer = new WebSocket(`${connectionUrl}/${remoteId}/${localId}/${key}`)

        // send message from local to remote
        localPeer.once(OPEN, () => localPeer.send('DUDE!!'))
        remotePeer.once(MESSAGE, d => {
          expect(d).toEqual('DUDE!!')
        })

        // send message from remote to local
        remotePeer.once(OPEN, () => remotePeer.send('hello'))
        localPeer.once(MESSAGE, d => {
          expect(d).toEqual('hello')
          done()
        })
      })
    })

    it('should close a peer when asked to', done => {
      expect.assertions(1)

      const localIntroductionPeer = makeIntroductionRequest(localId, key)
      const remoteIntroductionPeer = makeIntroductionRequest(remoteId, key) // need to make request even if we don't use the result

      localIntroductionPeer.once(MESSAGE, d => {
        const localPeer = new WebSocket(`${connectionUrl}/${localId}/${remoteId}/${key}`)
        const remotePeer = new WebSocket(`${connectionUrl}/${remoteId}/${localId}/${key}`)

        localPeer.once(OPEN, () => {
          localPeer.send('DUDE!!')
          // close local after sending
          localPeer.close()
        })

        remotePeer.once(MESSAGE, d => {
          expect(d).toEqual('DUDE!!')

          remotePeer.send('hello')
          localPeer.once(MESSAGE, d => {
            throw new Error('should never get here')
          })
          done()
        })
      })
    })
  })

  describe('N-way', () => {
    it('Should make introductions between all the peers', done => {
      const instances = ['a', 'b', 'c', 'd', 'e']
      const expectedIntroductions = factorial(instances.length) / factorial(instances.length - 2) // Permutations of 2
      expect.assertions(expectedIntroductions)
      const ids = instances.map(id => `peer-${id}-${testId}`)
      const introductionPeers = ids.map(d => makeIntroductionRequest(d, key))
      let invitations = 0
      introductionPeers.forEach(introductionPeer => {
        introductionPeer.on(MESSAGE, data => {
          const introduction = JSON.parse(data.toString())
          expect(introduction.type).toBe('Introduction')
          invitations++
          if (invitations === expectedIntroductions) done()
        })
      })
    })
  })
})

const factorial = (n: number): number => (n === 1 ? 1 : n * factorial(n - 1))
