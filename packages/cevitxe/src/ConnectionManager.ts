import { EventEmitter } from 'events'
import { Client, newid, Peer } from 'cevitxe-signal-client'
import debug from 'debug'
import * as Redux from 'redux'
import { Connection } from './Connection'
import { Repo } from './Repo'
import { ConnectionEvent } from 'cevitxe-types'

const log = debug('cevitxe:connectionmanager')
const { OPEN, CLOSE, PEER, PEER_REMOVE } = ConnectionEvent

/**
 * Wraps a Client and creates a Connection instance for each peer we connect to.
 */
export class ConnectionManager extends EventEmitter {
  private client: Client
  private connections: { [peerId: string]: Connection } = {}
  private dispatch: Redux.Dispatch
  private repo: Repo

  constructor({ repo, dispatch, discoveryKey, urls, clientId = newid() }: ClientOptions) {
    super()
    this.repo = repo
    this.dispatch = dispatch

    // TODO: randomly select a URL if more than one is provided? select best based on ping?
    this.client = new Client({ id: clientId, url: urls[0] })

    this.client.join(discoveryKey)
    this.client.on(PEER, this.addPeer)
    this.client.on(OPEN, () => this.emit(OPEN))
    this.client.on(CLOSE, () => this.emit(CLOSE))
  }

  private addPeer = (peer: Peer, discoveryKey: string) => {
    if (!this.dispatch || !this.repo) return
    const socket = peer.get(discoveryKey)
    if (socket) this.connections[peer.id] = new Connection(this.repo, socket, this.dispatch)
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
    const closeAllConnections = Object.keys(this.connections).map(peerId => this.removePeer(peerId))
    await Promise.all(closeAllConnections)
    this.connections = {}
  }
}

interface ClientOptions {
  repo: Repo
  dispatch: Redux.Dispatch
  discoveryKey: string
  urls: string[]
  clientId?: string
}
