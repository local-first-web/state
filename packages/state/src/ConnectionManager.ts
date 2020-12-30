import { Client, newid, Peer } from '@localfirst/relay-client'
import debug from 'debug'
import { EventEmitter } from 'events'
import A from 'automerge'
import * as Redux from 'redux'
import * as Auth from 'taco-js'
import { Connection } from './Connection'
import { PEER, OPEN, CLOSE, PEER_REMOVE, MESSAGE } from './constants'
import { Repo } from './Repo'
import { TeamSignatureChain } from 'taco-js/dist/chain'

const log = debug('lf:connectionmanager')

/**
 * Wraps a Client and creates a Connection instance for each peer we connect to.
 */
export class ConnectionManager extends EventEmitter {
  private client: Client
  private connections: { [peerId: string]: Connection } = {}
  private dispatch: Redux.Dispatch
  private repo: Repo
  private invitationOrTeam: Invitation | Promise<Auth.Team>

  constructor({ invitationOrTeam, repo, dispatch, discoveryKey, urls, clientId = newid() }: ClientOptions) {
    super()
    this.invitationOrTeam = invitationOrTeam
    this.repo = repo
    this.dispatch = dispatch

    // TODO: randomly select a URL if more than one is provided? select best based on ping?
    this.client = new Client({ id: clientId, url: urls[0] })

    this.client.join(discoveryKey)
    this.client.on(PEER, this.addPeer)
    this.client.on(OPEN, () => this.emit(OPEN))
    this.client.on(CLOSE, () => this.emit(CLOSE))
  }

  private addPeer = async (peer: Peer, discoveryKey: string) => {
    if (!this.dispatch || !this.repo) return
    const socket = peer.get(discoveryKey)

    // Use the team of perform a handshake to get the team
    let team: Auth.Team
    if (this.invitationOrTeam instanceof Promise) {
      console.log('We have a team. So lets use it!')
      team = await this.invitationOrTeam
    } else {
      console.log('We do not appear to have a team. What do we have?', this.invitationOrTeam)
      // Try to join the team. If it succeeds then we can create a new Connection.
      const p = performAuthHandshake(this.invitationOrTeam, socket)
      this.invitationOrTeam = p
      team = await p
    }

    if (socket) this.connections[peer.id] = new Connection(team, this.repo, socket, this.dispatch)
    peer.on(CLOSE, () => this.removePeer(peer.id))
    this.emit(PEER, Object.keys(this.connections))
    log('added peer', peer.id)
  
  }

  private removePeer = (peerId: string) => {
    if (this.connections[peerId]) this.connections[peerId].close()
    delete this.connections[peerId]
    this.emit(PEER_REMOVE, Object.keys(this.connections))
    log('removed peer', peerId)
  }

  public get connectionCount() {
    return Object.keys(this.connections).length
  }

  public async close() {
    const closeAllConnections = Object.keys(this.connections).map((peerId) =>
      this.removePeer(peerId)
    )
    await Promise.all(closeAllConnections)
    this.connections = {}
  }
}

export interface Invitation {
  username: string,
  invitationSeed: string
}

interface ClientOptions {
  invitationOrTeam: Invitation | Promise<Auth.Team>
  repo: Repo
  dispatch: Redux.Dispatch
  discoveryKey: string
  urls: string[]
  clientId?: string
}


async function performAuthHandshake(invite: Invitation, socket: WebSocket): Promise<Auth.Team> {
  function send<T>(action: string, payload: T) {
    socket.send(JSON.stringify({action, payload}))
  }

  const proof = Auth.generateProof(invite.invitationSeed, invite.username)
  console.log('Sending AUTH:JOIN to peer')
  send('AUTH:JOIN', proof)
  
  return new Promise((resolve, reject) => {
    const listener = ({data}: MessageEvent) => {
      const message = JSON.parse(data)
      const {type, action, payload} = message
      if (type === 'HELLO') {
        // ignore
        return
      }
      switch(action) {
        case 'AUTH:JOIN':
          console.log('Well this is awkward. The peer without a Team is being asked to respond to an AUTH:JOIN event. All we can do is ignore it')
          break
        case 'AUTH:ADMITTED':
          // const authHistoryChanges = payload
          // const authHistoryDoc = A.applyChanges(A.from({}), authHistoryChanges)
          const authHistoryDoc = payload
          const user = Auth.createUser({
            userName: invite.username,
            deviceName: 'Laptop',
            deviceType: 1, // DeviceType.laptop,
            seed: invite.invitationSeed
          })
          const team = new Auth.Team({
            source: authHistoryDoc as TeamSignatureChain,
            context: {user: user}
          })
          team.encrypt('Just testing for runtime error. Howdy Everyone! If this fails then BUG???? none of the lockboxes have a publicKey that matches the ephemeral one for this invitee. Ensure that the code for the tempkeys in Auth.Team.join are seeded with "invitationSeed" instead of "this.seed"')
  
          // Update my keys
          team.join(proof)

          // We successfully loaded the team. Resolve promises and remove this authentication listener
          ;(window as any).__TEAM_RESOLVE(team)
          socket.removeEventListener(MESSAGE, listener)
          resolve(team)
          break
        default:
          console.error(message)
          throw new Error(`BUG: unsupported message action "${action}"`)
      }
    }
    socket.addEventListener(MESSAGE, listener)

  })
}