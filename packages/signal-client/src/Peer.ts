import * as Base58 from 'bs58'
import Debug from 'debug'
import { Duplex } from 'stream'

import WebSocketStream from './WebSocketStream'
import { Info } from '../@types/Info'
import { PeerOptions } from '../@types/PeerOptions'

const log = Debug('discovery-cloud:ClientPeer')

export default class Peer {
  id: string
  url: string
  stream: (info: Info) => Duplex
  connections: Map<string, WebSocketStream> = new Map() // channel -> socket

  constructor({ url, id, stream }: PeerOptions) {
    this.url = url
    this.id = id
    this.stream = stream
  }

  has(channel: string): boolean {
    return this.connections.has(channel)
  }

  add(channel: string) {
    if (this.connections.has(channel)) return

    const url = [this.url, this.id, channel].join('/')
    const tag = [this.id.slice(0, 2), channel.slice(0, 2)].join('-')
    const socket = new WebSocketStream(url, tag)

    this.connections.set(channel, socket)

    const protocol = this.stream({
      channel: Base58.decode(channel),
      discoveryKey: Base58.decode(channel),
      live: true,
      download: true,
      upload: true,
      encrypt: false,
      hash: false,
    })

    socket.ready.then(socket => protocol.pipe(socket).pipe(protocol))

    protocol.on('error', err => {
      log('protocol.onerror %s', tag, err)
    })

    socket.on('error', err => {
      log('socket.onerror %s', tag, err)
    })

    socket.once('end', () => {
      log('socket.onend')
      this.remove(channel)
    })

    socket.once('close', () => {
      log('socket.onclose')
      this.remove(channel)
    })
  }

  close(channel: string) {
    const socket = this.connections.get(channel)
    if (socket) {
      log('%s closing socket: %s', this.id, channel)
      socket._destroy(null, () => {})
      this.connections.delete(channel)
    }
  }

  remove(channel: string) {
    log('%s removing connection: %s', this.id, channel)
    this.connections.delete(channel)
  }
}
