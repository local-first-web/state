import debug from 'debug'
import { EventEmitter } from 'events'
import express from 'express'
import expressWs from 'express-ws'
import { Server as HttpServer } from 'net'
import WebSocket, { Data } from 'ws'
import { ConnectRequestParams, KeySet } from './types'
import { deduplicate } from './lib/deduplicate'
import { intersection } from './lib/intersection'
import { pipeSockets } from './lib/pipeSockets'

const { app } = expressWs(express())

const log = debug('cevitxe:signal-server')

interface ListenOptions {
  silent?: boolean
}

/**
 * This server provides two services:
 *
 * - **Introductions** (aka discovery): A client can provide one or more document keys that they're
 *   interested in. If any other client is interested in the same key or keys, each will receive
 *   an `Introduction` message with the other's id. They can then use that information to connect:
 *
 * - **Connection**: Client A can request to connect with Client B on a given document key (can
 *   think of it as a 'channel'). If we get matching connection requests from A and B, we just pipe
 *   their sockets together.
 */
export class Server extends EventEmitter {
  port: number

  /**
   * In this context:
   * - `id` is always a peer id.
   * - `peer` is always a reference to a client's socket connection.
   * - `key` is always a document id (elsewhere referred to as a 'channel' or a 'discovery key'.
   */
  peers: { [id: string]: WebSocket }
  keys: { [id: string]: KeySet }

  /**
   * For two peers to connect, they both need to send a connection request, specifying both the
   * remote peer id and the document key. When we've gotten the request from peer A but not yet from
   * peer B, we temporarily store a reference to peer A's request in `holding`, and store any
   * messages from A in `messages`.
   */
  private holding: { [id: string]: WebSocket }
  private messages: { [id: string]: Data[] }

  /**
   * When we start listening, we keep a reference to the `httpServer` so we can close it if asked to.
   */
  private httpServer?: HttpServer

  constructor({ port = 8080 } = {}) {
    super()
    this.port = port
    this.peers = {}
    this.keys = {}
    this.holding = {}
    this.messages = {}
  }

  // DISCOVERY

  openIntroductionConnection(peer: WebSocket, id: string) {
    log('introduction connection', id)
    this.peers[id] = peer

    peer.on('message', this.receiveIntroductionRequest(id))
    peer.on('close', this.closeIntroductionConnection(id))

    this.emit('introductionConnection', id)
  }

  receiveIntroductionRequest(id: string) {
    const A = id // A and B always refer to peer ids

    // An introduction request from the client will include a list of keys to join and/or leave.
    // We combine those keys with any we already have.
    const applyJoinAndLeave = (current: KeySet = [], join: KeySet = [], leave: KeySet = []) => {
      return current
        .concat(join) // add `join` keys
        .filter(key => !leave.includes(key)) // remove `leave` keys
        .reduce(deduplicate, []) // filter out duplicates
    }

    // If we find another peer interested in the same key(s), we send both peers an introduction,
    // which they can use to connect
    const sendIntroduction = (A: string, B: string, keys: KeySet) => {
      const message = JSON.stringify({
        type: 'Introduction',
        id: B, // the id of the other peer
        keys, // the key(s) both are interested in
      })
      if (this.peers[A]) this.peers[A].send(message)
      else log(`can't send connect message to unknown peer`, A)
    }

    return (data: Data) => {
      const message = JSON.parse(data.toString())
      log('received introduction request %o', message)

      // honor join/leave requests
      const current = this.keys[A]
      const { join, leave } = message
      this.keys[A] = applyJoinAndLeave(current, join, leave)

      // if this peer (A) has interests in common with any existing peer (B), introduce them to each other
      for (const B in this.peers) {
        // don't introduce peer to themselves
        if (A !== B) {
          // find keys that both peers are interested in
          const commonKeys = intersection(this.keys[A], this.keys[B])
          if (commonKeys.length > 0) {
            log('notifying', A, B, commonKeys)
            sendIntroduction(A, B, commonKeys)
            sendIntroduction(B, A, commonKeys)
          }
        }
      }
    }
  }

  closeIntroductionConnection(id: string) {
    return () => {
      delete this.peers[id]
      delete this.keys[id]
    }
  }

  // PEER CONNECTIONS

  openConnection({ peerA, A, B, key }: ConnectRequestParams) {
    // A and B always refer to peer ids.

    // These are string keys for identifying this request and the reciprocal request
    // (which may or may not have already come in)
    const AseeksB = `${A}:${B}:${key}`
    const BseeksA = `${B}:${A}:${key}`

    if (!this.holding[BseeksA]) {
      // We haven't heard from B yet; hold this connection
      log('holding connection for peer', AseeksB)

      this.holding[AseeksB] = peerA // hold A's socket ready
      this.messages[AseeksB] = [] // hold any messages A sends to B in the meantime

      peerA.on('message', (message: Data) => {
        // hold on to incoming message from A for B
        if (this.messages[AseeksB]) this.messages[AseeksB].push(message)
      })

      peerA.on('close', () => {
        // clean up
        delete this.holding[AseeksB]
        delete this.messages[AseeksB]
      })
    } else {
      // We already have a connection request from B; hook them up
      log('found peer, connecting', AseeksB)

      const peerB = this.holding[BseeksA]

      // Send any stored messages
      this.messages[BseeksA].forEach(message => peerA.send(message))

      // Pipe the two sockets together
      pipeSockets(peerA, peerB)

      // Don't need to hold the connection or messages any more
      delete this.holding[BseeksA]
      delete this.messages[BseeksA]
    }
  }

  // SERVER

  listen({ silent = false }: ListenOptions = {}) {
    return new Promise(ready => {
      // It's nice to be able to hit this server from a browser as a sanity check
      app.get('/', (req, res, next) => {
        log('get /')
        res.send('<body style="font-size:10em;padding:2em;text-align:center">🐟</body>')
        res.end()
      })

      // Introduction request
      app.ws('/introduction/:id', (ws, { params: { id } }) => {
        log('received introduction request', id)
        this.openIntroductionConnection(ws as WebSocket, id)
      })

      // Connection request
      app.ws('/connect/:A/:B/:key', (ws, { params: { A, B, key } }) => {
        log('received connection request', A, B)
        this.openConnection({ peerA: ws as WebSocket, A, B, key })
      })

      this.httpServer = app.listen(this.port, () => {
        if (!silent) console.log(` 🐟  Listening at http://localhost:${this.port}  `)
        log('listening')
        this.emit('ready')
        ready()
      })
    })
  }

  close() {
    return new Promise(closed => {
      if (this.httpServer)
        this.httpServer.close(() => {
          this.emit('closed')
          closed()
        })
    })
  }
}
