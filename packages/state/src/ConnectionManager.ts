import { Client, newid, Peer } from '@localfirst/relay-client'
import debug from 'debug'
import { EventEmitter } from 'events'
import A from 'automerge'
import * as Redux from 'redux'
import * as Auth from '@philschatz/auth'
import { Connection } from './Connection'
import { PEER, OPEN, CLOSE, PEER_REMOVE, PEER_UPDATE } from './constants'
import { Repo } from './Repo'
import { performAuthHandshake } from './TeamManager'

const log = debug('lf:connectionmanager')

/**
 * Wraps a Client and creates a Connection instance for each peer we connect to.
 */
export class ConnectionManager extends EventEmitter {
  private client: Client
  private connections: { [peerId: string]: Connection } = {}
  private dispatch: Redux.Dispatch
  private repo: Repo
  private invitationOrTeam: Invitation | Auth.Team
  private discoveryKey: string

  constructor({ invitationOrTeam, repo, dispatch, discoveryKey, urls, clientId = newid() }: ClientOptions) {
    super()
    this.invitationOrTeam = invitationOrTeam
    this.repo = repo
    this.dispatch = dispatch
    this.discoveryKey = discoveryKey

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

    // Use the team or perform a handshake to get the team
    let team: Auth.Team
    if (this.invitationOrTeam instanceof Auth.Team) {
      team = await this.invitationOrTeam
    } else {
      team = await performAuthHandshake(this.repo, this.discoveryKey, this.invitationOrTeam, socket)
      this.invitationOrTeam = team
    }

    if (socket) {
      const c = new Connection(team, this.repo, socket, this.dispatch)
      this.connections[peer.id] = c
      c.on(PEER_UPDATE, () => this.emit(PEER_UPDATE, Object.keys(this.connections), Object.values(this.connections).map(c => c.getAuthenticatedUser())))
    }
    peer.on(CLOSE, () => this.removePeer(peer.id))
    this.emit(PEER, Object.keys(this.connections), Object.values(this.connections).map(c => c.getAuthenticatedUser()))
    log('added peer', peer.id)
  
  }

  private removePeer = (peerId: string) => {
    if (this.connections[peerId]) this.connections[peerId].close()
    delete this.connections[peerId]
    this.emit(PEER_REMOVE, Object.keys(this.connections), Object.values(this.connections).map(c => c.getAuthenticatedUser()))
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
  invitationOrTeam: Invitation | Auth.Team
  repo: Repo
  dispatch: Redux.Dispatch
  discoveryKey: string
  urls: string[]
  clientId?: string
}


