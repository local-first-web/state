import * as Base58 from 'bs58'
import Debug from 'debug'
import { Duplex } from 'stream'

import WebSocketStream from './WebSocketStream'
import { HypercoreOptions } from '../@types/Info'
import { PeerOptions } from '../@types/PeerOptions'
import { EventEmitter } from 'events'

const log = Debug('discovery-cloud:ClientPeer')

export default class Peer extends Duplex {
  id: string
  url: string
  keys: Map<string, WebSocketStream> = new Map() // key -> socket

  constructor({ url, id }: PeerOptions) {
    super()
    this.url = url
    this.id = id
    // this.stream = stream
  }

  has(key: string): boolean {
    return this.keys.has(key)
  }

  add(key: string) {
    if (this.keys.has(key)) return

    const url = `${this.url}/${this.id}/${key}`
    const tag = `${this.id.slice(0, 2)}-${key.slice(0, 2)}`

    const socket = new WebSocketStream(url, tag)

    this.keys.set(key, socket)

    // socket.ready.then(socket => protocol.pipe(socket).pipe(protocol))

    // protocol.on('error', err => {
    //   log('protocol.onerror %s', tag, err)
    // })

    socket.on('error', err => {
      log('socket.onerror %s', tag, err)
    })

    socket.once('end', () => {
      log('socket.onend')
      this.remove(key)
    })

    socket.once('close', () => {
      log('socket.onclose')
      this.remove(key)
    })
  }

  close(key: string) {
    const socket = this.keys.get(key)
    if (socket) {
      log('%s closing socket: %s', this.id, key)
      socket._destroy(null, () => {})
      this.keys.delete(key)
    }
  }

  remove(key: string) {
    log('%s removing connection: %s', this.id, key)
    this.keys.delete(key)
  }
}
