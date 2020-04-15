import { Client as SignalClient, newid, Peer } from 'cevitxe-signal-client'
import debug from 'debug'
import * as Redux from 'redux'
import { Connection } from './Connection'
import { Repo } from './Repo'
import { pause } from './pause'

const log = debug('cevitxe:client')

/**
 * Wraps a SignalClient and creates a Connection instance for each peer we connect to.
 */
export class ConnectionManager {
  private signalClient: SignalClient
  private connections: { [peerId: string]: Connection } = {}
  private dispatch: Redux.Dispatch
  private repo: Repo

  constructor({ repo, dispatch, discoveryKey, urls, clientId = newid() }: ClientOptions) {
    this.repo = repo
    this.dispatch = dispatch

    // TODO: randomly select a URL if more than one is provided? select best based on ping?
    this.signalClient = new SignalClient({ id: clientId, url: urls[0] })

    this.signalClient.join(discoveryKey)
    this.signalClient.on('peer', this.addPeer)
  }

  private addPeer = (peer: Peer, discoveryKey: string) => {
    if (!this.dispatch || !this.repo) return
    log('connecting to peer', peer.id)
    const socket = peer.get(discoveryKey)
    if (socket) this.connections[peer.id] = new Connection(this.repo, socket, this.dispatch)
    peer.on('close', () => this.removePeer(peer.id))
  }

  private removePeer = (peerId: string) => {
    log('removing peer', peerId)
    if (this.connections[peerId]) this.connections[peerId].close()
    delete this.connections[peerId]
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
