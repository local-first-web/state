import { debug } from 'debug-deluxe'
import express from 'express'
import expressWs from 'express-ws'
import { Server as HttpServer } from 'net'
import WebSocket, { Data } from 'ws'

import { Message } from '../@types/Message'
import { mergeUnique } from './mergeUnique'
import { EventEmitter } from 'events'

const { app } = expressWs(express())

const log = debug('cevitxe:signal-server')

export class Server extends EventEmitter {
  port: number
  peers: { [id: string]: WebSocket }
  peerKeys: { [id: string]: string[] }
  looking: { [id: string]: WebSocket }
  buffers: { [id: string]: Data[] }

  private httpServer?: HttpServer

  constructor({ port = 8080 } = {}) {
    super()
    this.port = port
    this.peers = {}
    this.peerKeys = {}
    this.looking = {}
    this.buffers = {}
  }

  // DISCOVERY

  openDiscoveryConnection(ws: WebSocket, peerId: string) {
    log('discovery connection')
    this.peers[peerId] = ws

    ws.on('message', this.receiveDiscoveryMessage(peerId))
    ws.on('close', this.closeDiscoveryConnection(peerId))

    this.emit('discoveryConnection', peerId)
  }

  receiveDiscoveryMessage(peerId: string) {
    const applyPeers = (peerId: string, join?: string[], leave?: string[]) => {
      this.peerKeys[peerId] = mergeUnique(this.peerKeys[peerId], join, leave)
      log('applyPeers', peerId, this.peerKeys[peerId])
    }

    const getIntersection = (peerId1: string, peerId2: string) => {
      if (peerId1 === peerId2) return
      const peerIds1: string[] = this.peerKeys[peerId1] || []
      const peerIds2: string[] = this.peerKeys[peerId2] || []
      const intersection = peerIds1.filter(val => peerIds2.includes(val))
      if (intersection.length > 0) return intersection
    }

    const send = (peerId: string, message: Message) => {
      if (this.peers[peerId]) {
        this.peers[peerId].send(JSON.stringify(message))
      } else {
        log('error - trying to send to bad peer', peerId)
      }
    }

    const notifyIntersections = (peerId1: string) => {
      for (const peerId2 in this.peers) {
        const intersection = getIntersection(peerId1, peerId2)
        if (intersection) {
          log('notifying', peerId1, peerId2, intersection)
          send(peerId1, { type: 'Connect', peerId: peerId2, peerChannels: intersection })
          send(peerId2, { type: 'Connect', peerId: peerId1, peerChannels: intersection })
        }
      }
    }

    return (data: Data) => {
      const msg = JSON.parse(data.toString())
      log('message', msg)
      applyPeers(peerId, msg.join, msg.leave)
      notifyIntersections(peerId)
    }
  }

  closeDiscoveryConnection(id: string) {
    return () => {
      delete this.peers[id]
      delete this.peerKeys[id]
    }
  }

  // PEER CONNECTIONS

  connectPeers(socket1: WebSocket, peerId1: string, peerId2: string, key: string) {
    const key1 = `${peerId1}:${peerId2}:${key}`
    const key2 = `${peerId2}:${peerId1}:${key}`

    const join = (socket1: WebSocket, socket2: WebSocket) => {
      socket1.on('message', data => {
        if (socket2.readyState === WebSocket.OPEN) {
          socket2.send(data)
        } else {
          socket1.close()
        }
      })
    }

    if (this.looking[key2]) {
      log('connecting peers', key1, key2)
      const socket2 = this.looking[key2]

      this.buffers[key2].forEach(data => socket1.send(data))

      delete this.looking[key2]
      delete this.buffers[key2]

      log('piping', key1)
      join(socket1, socket2)
      join(socket2, socket1)
      const cleanup = () => {
        socket1.close()
        socket2.close()
      }

      socket1.on('error', cleanup)
      socket2.on('error', cleanup)
      socket1.on('close', cleanup)
      socket2.on('close', cleanup)
    } else {
      log('holding connection - waiting for peer', key1, key2)
      this.looking[key1] = socket1
      this.buffers[key1] = []

      socket1.on('message', this.receivePeerData(key1))
      socket1.on('close', this.closePeerConnection(key1))
    }
  }

  receivePeerData(key: string) {
    return (data: Data) => {
      if (this.buffers[key]) this.buffers[key].push(data)
    }
  }

  closePeerConnection(key: string) {
    return () => {
      delete this.looking[key]
      delete this.buffers[key]
    }
  }

  // SERVER

  listen() {
    return new Promise(ready => {
      app.get('/', (req, res, next) => {
        log('get /')
        res.send('@cevitxe/signal-server')
        res.end()
      })

      app.ws('/discovery/:peerId', (_ws, { params: { peerId } }) => {
        // TODO: fix types ( @types/express-ws references an older version)
        const ws = (_ws as any) as WebSocket
        this.openDiscoveryConnection(ws, peerId)
      })

      app.ws('/connect/:peerId1/:peerId2/:key', (_ws, { params: { peerId1, peerId2, key } }) => {
        // TODO: fix types ( @types/express-ws references an older version) asdf
        const ws = _ws as WebSocket
        this.connectPeers(ws, peerId1, peerId2, key)
      })

      this.httpServer = app.listen(this.port, '0.0.0.0', () => {
        console.log(`Listening at http://localhost:${this.port}`)
        this.emit('ready')
        ready()
      })
    })
  }

  close() {
    return new Promise(closed => {
      if (this.httpServer) this.httpServer.close(() => closed())
    })
  }
}
