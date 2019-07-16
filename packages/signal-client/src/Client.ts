import * as Base58 from 'bs58'
import { debug } from 'debug-deluxe'
import { EventEmitter } from 'events'
import { Duplex } from 'stream'

import Peer from './Peer'
import { Info } from '../@types/Info'
import { Message } from '../@types/Message'
import WebSocket from './WebSocket'
import { ClientOptions } from '../@types/ClientOptions'

debug.formatters.b = Base58.encode

const log = debug('discovery-cloud:Client')

export class Client extends EventEmitter {
  connect: (info: Info) => Duplex
  id: string
  selfKey: Buffer
  url: string
  channels: Set<string> = new Set()
  peers: Map<string, Peer> = new Map()
  discoveryConnection: WebSocket

  constructor(opts: ClientOptions) {
    super()

    this.selfKey = opts.id
    this.id = Base58.encode(opts.id)
    this.url = opts.url
    this.connect = opts.stream
    this.discoveryConnection = this.connectDiscovery()

    log('Initialized %o', opts)
  }

  join(channelBuffer: Buffer) {
    log('join %b', channelBuffer)

    const channel = Base58.encode(channelBuffer)
    this.channels.add(channel)

    if (this.discoveryConnection.readyState === WebSocket.OPEN) {
      this.send({
        type: 'Join',
        id: this.id,
        join: [channel],
      })
    }
  }

  leave(channelBuffer: Buffer) {
    log('leave %b', channelBuffer)

    const channel = Base58.encode(channelBuffer)
    this.channels.delete(channel)
    this.peers.forEach(peer => {
      if (peer.has(channel)) peer.close(channel)
    })

    if (this.discoveryConnection.readyState === WebSocket.OPEN) {
      this.send({
        type: 'Leave',
        id: this.id,
        leave: [channel],
      })
    }
  }

  listen(_port: unknown) {
    // NOOP
  }

  private connectDiscovery(): WebSocket {
    const url = `${this.url}/discovery/${this.id}`

    log('connectDiscovery', url)

    this.discoveryConnection = new WebSocket(url)

    this.discoveryConnection.addEventListener('open', () => {
      this.sendHello()
    })

    this.discoveryConnection.addEventListener('close', () => {
      log('discovery.onclose... reconnecting in 5s')
      setTimeout(() => {
        this.connectDiscovery()
      }, 5000)
    })

    this.discoveryConnection.addEventListener('message', event => {
      const data = Buffer.from(event.data)
      log('discovery.ondata', data)
      this.receive(JSON.parse(data.toString()))
    })

    this.discoveryConnection.addEventListener('error', (event: any) => {
      console.error('discovery.onerror', event.error)
    })

    return this.discoveryConnection
  }

  private sendHello() {
    const msg: Message.Hello = {
      type: 'Hello',
      id: this.id,
      join: [...this.channels],
    }
    this.send(msg)
  }

  private send(msg: Message.ClientToServer) {
    log('discovery.send %o', msg)
    this.discoveryConnection.send(JSON.stringify(msg))
  }

  private receive(msg: Message.ServerToClient) {
    log('discovery.receive %o', msg)
    switch (msg.type) {
      case 'Connect':
        this.onConnect(msg.peerId, msg.peerChannels)
        break
    }
  }

  private onConnect(id: string, channels: string[]) {
    const peer = this.newPeer(id)

    const newChannels = channels.filter(ch => !peer.connections.has(ch))

    newChannels.forEach(channel => {
      peer.add(channel)
    })
  }

  newPeer(id: string): Peer {
    const existing = this.peers.get(id)
    if (existing) return existing

    log('creating peer %s', id)
    const url = `${this.url}/connect/${this.id}`
    const peer = new Peer({ url, id, stream: this.connect })
    this.peers.set(id, peer)

    this.emit('peer', peer, id)
    return peer
  }
}
