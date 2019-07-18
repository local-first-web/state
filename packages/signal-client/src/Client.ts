import * as Base58 from 'bs58'
import { debug } from 'debug-deluxe'
import { EventEmitter } from 'events'
import { Duplex } from 'stream'

import { Peer } from './Peer'
import { Message } from '../@types/Message'
import WebSocket from './WebSocket'
import { ClientOptions } from '../@types/ClientOptions'

debug.formatters.b = Base58.encode

const log = debug('cevitxe:signal-client')

export class Client extends EventEmitter {
  stream: () => Duplex
  id: string
  url: string
  keys: Set<string> = new Set()
  peers: Map<string, Peer> = new Map()
  serverConnection: WebSocket

  constructor(opts: ClientOptions) {
    super()

    this.id = opts.id
    this.url = opts.url
    this.stream = opts.stream

    this.serverConnection = this.connectToServer()
    log('Initialized %o', opts)
  }

  join(key: string) {
    log('join', key)

    this.keys.add(key)

    if (this.serverConnection.readyState === WebSocket.OPEN) {
      this.sendToServer({
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
      this.sendToServer({
        type: 'Leave',
        id: this.id,
        leave: [key],
      })
    }
  }

  listen(_port: unknown) {
    // NOOP
  }

  private connectToServer(): WebSocket {
    const url = `${this.url}/introduction/${this.id}`

    log('connectIntroduction', url)

    this.serverConnection = new WebSocket(url)

    this.serverConnection.addEventListener('open', () => {
      this.sendToServer({
        type: 'Hello',
        id: this.id,
        join: [...this.keys],
      })
    })

    this.serverConnection.addEventListener('close', () => {
      log('server connection closed... reconnecting in 5s')
      setTimeout(() => {
        this.connectToServer()
      }, 5000)
    })

    this.serverConnection.addEventListener('message', ({ data }) => {
      log('message from server', data)
      const message = JSON.parse(data) as Message.ServerToClient
      this.receiveFromServer(message)
    })

    this.serverConnection.addEventListener('error', (event: any) => {
      console.error('introduction.onerror', event.error)
    })

    return this.serverConnection
  }

  private sendToServer(msg: Message.ClientToServer) {
    log('introduction.send %o', msg)
    this.serverConnection.send(JSON.stringify(msg))
  }

  private receiveFromServer(msg: Message.ServerToClient) {
    log('introduction.receive %o', msg)
    switch (msg.type) {
      case 'Connect':
        {
          const { id, keys = [] } = msg
          const peer = this.peers.get(id) || this.newPeer(id)
          const newKeys = keys.filter(key => !peer.keys.has(key))
          newKeys.forEach(key => {
            peer.on('ready', peerKey => {
              log('peer ready', id, peerKey)
              this.emit('peer', peer, key)
            })
            peer.add(key)
          })
        }
        break
    }
  }

  private newPeer(_id: string): Peer {
    log('creating peer %s', _id)
    const url = `${this.url}/connect/${this.id}`
    const peer = new Peer({ url, id: _id, stream: this.stream })
    this.peers.set(_id, peer)
    return peer
  }
}
