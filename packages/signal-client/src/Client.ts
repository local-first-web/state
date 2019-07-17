import * as Base58 from 'bs58'
import { debug } from 'debug-deluxe'
import { EventEmitter } from 'events'
import { Duplex } from 'stream'

import Peer from './Peer'
import { HypercoreOptions } from '../@types/Info'
import { Message } from '../@types/Message'
import WebSocket from './WebSocket'
import { ClientOptions } from '../@types/ClientOptions'

debug.formatters.b = Base58.encode

const log = debug('cevitxe:signal-client')

export class Client extends EventEmitter {
  // connect: (info: HypercoreOptions) => Duplex
  id: string
  url: string
  keys: Set<string> = new Set()
  peers: Map<string, Peer> = new Map()
  serverConnection: WebSocket

  constructor(opts: ClientOptions) {
    super()

    this.id = opts.id
    this.url = opts.url
    // this.connect = opts.stream
    this.serverConnection = this.connect()

    log('Initialized %o', opts)
  }

  join(key: string) {
    log('join', key)

    this.keys.add(key)

    if (this.serverConnection.readyState === WebSocket.OPEN) {
      this.send({
        type: 'Join',
        id: this.id,
        join: [key],
      })
    }
  }

  leave(key: string) {
    log('leave', key)

    this.keys.delete(key)
    this.peers.forEach(peer => {
      if (peer.has(key)) peer.close(key)
    })

    if (this.serverConnection.readyState === WebSocket.OPEN) {
      this.send({
        type: 'Leave',
        id: this.id,
        leave: [key],
      })
    }
  }

  listen(_port: unknown) {
    // NOOP
  }

  private connect(): WebSocket {
    const url = `${this.url}/introduction/${this.id}`

    log('connectIntroduction', url)

    this.serverConnection = new WebSocket(url)

    this.serverConnection.addEventListener('open', () => {
      this.send({
        type: 'Hello',
        id: this.id,
        join: [...this.keys],
      })
    })

    this.serverConnection.addEventListener('close', () => {
      log('server connection closed... reconnecting in 5s')
      setTimeout(() => {
        this.connect()
      }, 5000)
    })

    this.serverConnection.addEventListener('message', ({ data }) => {
      log('message from server', data)
      const message = JSON.parse(data) as Message.ServerToClient
      this.receive(message)
    })

    this.serverConnection.addEventListener('error', (event: any) => {
      console.error('introduction.onerror', event.error)
    })

    return this.serverConnection
  }

  private send(msg: Message.ClientToServer) {
    log('introduction.send %o', msg)
    this.serverConnection.send(JSON.stringify(msg))
  }

  private receive(msg: Message.ServerToClient) {
    log('introduction.receive %o', msg)
    switch (msg.type) {
      case 'Connect':
        {
          const { id, keys = [] } = msg
          const peer = this.peers.get(id) || this.newPeer(id)
          const newKeys = keys.filter(key => !peer.keys.has(key))
          newKeys.forEach(key => peer.add(key))
        }
        break
    }
  }

  newPeer(id: string): Peer {
    log('creating peer %s', id)
    const url = `${this.url}/connect/${this.id}`
    const peer = new Peer({ url, id })
    this.peers.set(id, peer)

    this.emit('peer', peer)
    return peer
  }
}
