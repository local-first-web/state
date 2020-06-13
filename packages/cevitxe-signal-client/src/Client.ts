import debug, { Debugger } from 'debug'
import { EventEmitter } from 'events'

import { Peer } from './Peer'
import { Message } from 'cevitxe-signal-server'
import { ClientOptions } from './types'
import { newid } from './newid'
import { ConnectionEvent } from 'cevitxe-types'

const { OPEN, CLOSE, PEER } = ConnectionEvent

const initialRetryDelay = 1000
const backoffCoeff = 1.5 + Math.random() * 0.1

/**
 * This is a client for `cevitxe-signal-server` that makes it easier to interact with it.
 *
 * You don't strictly need to use this client - you can interact directly with the server the way we
 * do in the server tests - but it automates the business of accepting invitations when they're
 * received.
 *
 * The client keeps track of all peers that the server connects you to, and for each peer it keeps
 * track of each key (aka discoveryKey, aka channel) that you're working with that peer on.
 *
 * The simplest workflow is something like this:
 *
 * ```ts
 * client = new Client({ id: 'my-peer-id', url })
 * client.join('my-document-id')
 * client.on('peer', (peer, key) => {
 *   const socket = peer.get(key) // `socket` is a WebSocket instance
 *
 *   // send a message
 *   socket.send('Hello!')
 *
 *   // listen for messages
 *   socket.onmessage = () => {
 *     console.log(messsage)
 *   }
 * })
 * ```
 */
export class Client extends EventEmitter {
  id: string
  url: string
  keys: Set<string> = new Set()
  peers: Map<string, Peer> = new Map()
  serverConnection: WebSocket
  retryDelay: number

  log: Debugger

  /**
   * @param id a string that identifies you uniquely, defaults to a UUID
   * @param url the url of the `cevitxe-signal-server`, e.g. `http://signal.mydomain.com`
   */
  constructor({ id = newid(), url }: ClientOptions) {
    super()
    this.log = debug(`cevitxe:signal-client:${id}`)

    this.id = id
    this.url = url
    this.retryDelay = initialRetryDelay
    this.serverConnection = this.connectToServer() // this is a WebSocket
  }

  private connectToServer(): WebSocket {
    const url = `${this.url}/introduction/${this.id}`

    this.log('connecting to signal server', url)

    this.serverConnection = new WebSocket(url)

    const onopen = () => {
      // successful connection - reset retry delay
      this.retryDelay = initialRetryDelay

      this.sendToServer({
        type: 'Join',
        join: [...this.keys],
      })
      this.emit(OPEN)
    }

    const onclose = () => {
      this.retryDelay *= backoffCoeff
      this.log(
        `signal server connection closed... retrying in ${Math.floor(this.retryDelay / 1000)}s`
      )
      setTimeout(() => this.connectToServer(), this.retryDelay)
      this.emit(CLOSE)
    }

    const onmessage = ({ data }: { data: string }) => {
      this.log('message from signal server', data)
      const message = JSON.parse(data.toString()) as Message.ServerToClient
      this.receiveFromServer(message)
    }

    const onerror = (args: any) => {
      this.log('signal server error', args)
    }

    this.serverConnection.onopen = onopen.bind(this)
    this.serverConnection.onclose = onclose.bind(this)
    this.serverConnection.onmessage = onmessage.bind(this)
    this.serverConnection.onerror = onerror.bind(this)

    return this.serverConnection
  }

  // Joining a key (discoveryKey) lets the server know that you're interested in it, and if there are
  // other peers who have joined the same key, you and the remote peer will both receive an
  // introduction message, inviting you to connect.
  join(key: string) {
    this.log('joining', key)

    this.keys.add(key)

    this.sendToServer({
      type: 'Join',
      join: [key],
    })
  }

  leave(key: string) {
    this.log('leaving', key)

    this.keys.delete(key)
    this.peers.forEach(peer => peer.close(key))

    this.sendToServer({
      type: 'Leave',
      leave: [key],
    })
  }

  private sendToServer(msg: Message.ClientToServer) {
    if (this.serverConnection.readyState === WebSocket.OPEN) {
      this.log('sending to server %o', msg)
      this.serverConnection.send(JSON.stringify(msg))
    }
  }

  // The only kind of message that we receive from the signal server is an introduction, which tells
  // us that someone else is interested in the same thing we are. When we receive that message, we
  // automatically try to connect "directly" to the peer (via piped sockets on the signaling server).
  private receiveFromServer(msg: Message.ServerToClient) {
    this.log('received from signal server %o', msg)
    switch (msg.type) {
      case 'Introduction':
        {
          const { id, keys = [] } = msg
          const peer = this.peers.get(id) || this.connectToPeer(id)
          const newKeys = keys.filter(key => !peer.has(key))
          newKeys.forEach(key => {
            peer.on(OPEN, peerKey => {
              this.log('found peer', id, peerKey)
              this.emit(PEER, peer, key)
            })
            peer.add(key)
          })
        }
        break
    }
  }

  private connectToPeer(id: string): Peer {
    this.log('requesting direct connection to peer', id)
    const url = `${this.url}/connection/${this.id}` // remaining parameters are added by peer
    const peer = new Peer({ url, id })
    this.peers.set(id, peer)
    return peer
  }
}

// It's normal for a document with a lot of participants to have a lot of connections, so increase
// the limit to avoid spurious warnings about emitter leaks.
EventEmitter.defaultMaxListeners = 500
