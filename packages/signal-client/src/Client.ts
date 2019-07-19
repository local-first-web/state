import { debug, DebuggerDeluxe } from 'debug-deluxe'
import { EventEmitter } from 'events'

import { Peer } from './Peer'
import { Message } from '../@types/Message'
import WebSocket from 'ws'
import { ClientOptions } from '../@types/ClientOptions'
import uuid from 'uuid'

/**
 * This is a client for `cevitxe-signal-server` that makes it easier to interact with it.
 *
 * You don't strictly need to use this client - you can interact directly with the server the way we
 * do in the server tests - but it automates the business of accepting invitations when they're
 * received.
 *
 * The client keeps track of all peers that the server connects you to, and for each peer it keeps
 * track of each key (aka documentId, aka channel) that you're working with that peer on.
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
 *   socket.on('message', message => {
 *     console.log(messsage)
 *   })
 * })
 * ```
 */
export class Client extends EventEmitter {
  id: string
  url: string
  keys: Set<string> = new Set()
  peers: Map<string, Peer> = new Map()
  serverConnection: WebSocket

  log: DebuggerDeluxe

  /**
   * @param id a string that identifies you uniquely, defaults to a UUID
   * @param url the url of the `cevitxe-signal-server`, e.g. `http://signal.mydomain.com`
   */
  constructor({ id = uuid(), url }: ClientOptions) {
    super()
    this.log = debug(`cevitxe:signal-client:${id}`)

    this.id = id
    this.url = url
    this.serverConnection = this.connectToServer() // this is a WebSocket

    this.log('Initialized', url)
  }

  private connectToServer(): WebSocket {
    const url = `${this.url}/introduction/${this.id}`

    this.log('connectIntroduction', url)

    this.serverConnection = new WebSocket(url)

    this.serverConnection.on('open', () => {
      this.sendToServer({
        type: 'Hello',
        id: this.id,
        join: [...this.keys],
      })
    })

    this.serverConnection.on('close', () => {
      this.log('server connection closed... reconnecting in 5s')
      setTimeout(this.connectToServer, 5000)
    })

    this.serverConnection.on('message', data => {
      this.log('message from server', data)
      const message = JSON.parse(data.toString()) as Message.ServerToClient
      this.receiveFromServer(message)
    })

    this.serverConnection.on('error', (event: any) => {
      console.error('server.onerror', event.error)
    })

    return this.serverConnection
  }

  // Joining a key (documentId) lets the server know that you're interested in it, and if there are
  // other peers who have joined the same key, you and the remote peer will both receive an
  // introduction message, inviting you to connect.
  join(key: string) {
    this.log('join', key)

    this.keys.add(key)

    this.sendToServer({
      type: 'Join',
      id: this.id,
      join: [key],
    })
  }

  leave(key: string) {
    this.log('leave', key)

    this.keys.delete(key)
    this.peers.forEach(peer => {
      if (peer.has(key)) peer.close(key)
    })

    this.sendToServer({
      type: 'Leave',
      id: this.id,
      leave: [key],
    })
  }

  private sendToServer(msg: Message.ClientToServer) {
    if (this.serverConnection.readyState === WebSocket.OPEN) {
      this.log('server.send %o', msg)
      this.serverConnection.send(JSON.stringify(msg))
    }
  }

  // The only kind of message that we receive from the signal server is an introduction, which tells
  // us that someone else is interested in the same thing we are. When we receive that message, we
  // automatically try to connect "directly" to the peer (via piped sockets on the signaling server).
  private receiveFromServer(msg: Message.ServerToClient) {
    this.log('server.receive %o', msg)
    switch (msg.type) {
      case 'Introduction':
        {
          const { id, keys = [] } = msg
          const peer = this.peers.get(id) || this.newPeer(id)
          const newKeys = keys.filter(key => !peer.has(key))
          newKeys.forEach(key => {
            peer.on('open', peerKey => {
              this.log('peer open', id, peerKey)
              this.emit('peer', peer, key)
            })
            peer.add(key)
          })
        }
        break
    }
  }

  private newPeer(id: string): Peer {
    this.log('creating peer %s', id)
    const url = `${this.url}/connect/${this.id}`
    const peer = new Peer({ url, id })
    this.peers.set(id, peer)
    return peer
  }
}
