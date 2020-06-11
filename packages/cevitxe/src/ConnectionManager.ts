import { EventEmitter } from 'events'
import { Client as SignalClient, newid, Peer } from 'cevitxe-signal-client'
import debug from 'debug'
import * as Redux from 'redux'
import { Connection } from './Connection'
import { Repo } from './Repo'

const log = debug('cevitxe:connectionmanager')

/**
 * Wraps a SignalClient and creates a Connection instance for each peer we connect to.
 */
export class ConnectionManager extends EventEmitter {
  private signalClient: SignalClient
  private connections: { [peerId: string]: Connection } = {}
  private dispatch: Redux.Dispatch
  private repo: Repo

  constructor({ repo, dispatch, discoveryKey, urls, clientId = newid() }: ClientOptions) {
    super()
    this.repo = repo
    this.dispatch = dispatch

    // TODO: randomly select a URL if more than one is provided? select best based on ping?
    this.signalClient = new SignalClient({ id: clientId, url: urls[0] })

    this.signalClient.join(discoveryKey)
    this.signalClient.on('peer', this.addPeer)
    this.signalClient.on('open', () => this.emit(CONNECTION.OPEN))
    this.signalClient.on('close', () => this.emit(CONNECTION.CLOSE))
  }

  private addPeer = (peer: Peer, discoveryKey: string) => {
    if (!this.dispatch || !this.repo) return
    const socket = peer.get(discoveryKey)
    if (socket) this.connections[peer.id] = new Connection(this.repo, socket, this.dispatch)
    peer.on('close', () => this.removePeer(peer.id))
    log('added peer', peer.id)
    this.emit(CONNECTION.PEER_ADD, Object.keys(this.connections))
  }

  private removePeer = (peerId: string) => {
    if (this.connections[peerId]) this.connections[peerId].close()
    delete this.connections[peerId]
    log('removed peer', peerId)
    this.emit(CONNECTION.PEER_REMOVE, Object.keys(this.connections))
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

export enum CONNECTION {
  OPEN = 'open',
  CLOSE = 'close',
  PEER_ADD = 'peer_add',
  PEER_REMOVE = 'peer_remove'
}