import Debug from 'debug'
import WebSocket from 'ws'
import { PeerOptions } from '../@types/PeerOptions'
import { EventEmitter } from 'events'

const log = Debug('cevitxe:signal-client:peer')

/**
 * The Peer class holds one or more sockets, one per key (aka documentId aka channel).
 * To get the socket corresponding to a given key:
 * ```ts
 * const socket = peer.get(key)
 * ```
 *
 * You interact with that socket just like you would any socket:
 * ```ts
 * socket.send('hello!')
 * socket.on('message', message => {...})
 * ```
 */
export class Peer extends EventEmitter {
  id: string
  url: string
  private keys: Map<string, WebSocket> = new Map() // key -> socket

  constructor({ url, id }: PeerOptions) {
    super()
    this.url = url
    this.id = id
  }

  add(key: string) {
    if (this.keys.has(key)) return

    const id = this.id
    const url = `${this.url}/${id}/${key}`

    const socket = new WebSocket(url)
    this.keys.set(key, socket)

    socket.on('error', err => {
      log('socket.onerror %s', err)
    })

    socket.once('end', () => {
      log('socket.onend')
      this.remove(key)
    })

    socket.once('close', () => {
      log('socket.onclose')
      this.remove(key)
    })

    socket.on('open', () => {
      log('open', key)
      this.emit('open', key)
    })
  }

  has(key: string): boolean {
    return this.keys.has(key)
  }

  get(key: string) {
    return this.keys.get(key)
  }

  close(key: string) {
    const socket = this.get(key)
    if (socket) {
      log('%s closing socket: %s', this.id, key)
      socket.close()
      this.keys.delete(key)
    }
  }

  remove(key: string) {
    log('%s removing connection: %s', this.id, key)
    this.keys.delete(key)
  }
}
