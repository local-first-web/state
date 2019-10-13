import * as Redux from 'redux'
import { Client as SignalClient, newid, Peer } from 'cevitxe-signal-client'
import { EventEmitter } from 'events'
import { Connection } from './Connection'
import { Repo } from './Repo'

import debug from 'debug'
const log = debug('cevitxe:client')

export class Client extends EventEmitter {
  private clientId = newid()
  private signalClient: SignalClient
  public connections: { [peerId: string]: Connection } = {}

  private dispatch: Redux.Dispatch
  private repo: Repo

  constructor({ repo, dispatch, discoveryKey, urls }: ClientOptions) {
    super()
    this.signalClient = new SignalClient({ id: this.clientId, url: urls[0] }) // TODO: randomly select a URL if more than one is provided? select best based on ping?
    this.signalClient.join(discoveryKey)
    this.signalClient.on('peer', this.addPeer)
    this.repo = repo
    this.dispatch = dispatch
    this.connections = {}
  }

  private addPeer = (peer: Peer, discoveryKey: string) => {
    if (!this.dispatch || !this.repo) return
    log('connecting to peer', peer.id)
    const socket = peer.get(discoveryKey)
    this.connections[peer.id] = new Connection(this.repo, socket, this.dispatch)
    this.emit('peer', peer) // hook for testing
    log('connected to peer', peer.id)
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
    this.removeAllListeners()
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
}

// It's normal for a document with a lot of participants to have a lot of connections, so increase
// the limit to avoid spurious warnings about emitter leaks.
EventEmitter.defaultMaxListeners = 500
