import { debug } from 'debug-deluxe'
import express from 'express'
import expressWs from 'express-ws'
import WebSocket, { Data } from 'ws'

import { Message } from '../@types/Message'
import { mergeUnique } from './mergeUnique'

const _app = express()
expressWs(_app)
const app = (_app as any) as expressWs.Application

const log = debug('cevitxe:signal-server')

export class Server {
  port: number
  peers: { [id: string]: WebSocket }
  peerIds: { [id: string]: string[] }
  looking: { [id: string]: WebSocket }
  buffers: { [id: string]: Data[] }

  constructor({ port = 8080 } = {}) {
    this.port = port
    this.peers = {}
    this.peerIds = {}
    this.looking = {}
    this.buffers = {}
  }

  // DISCOVERY

  openDiscoveryConnection(ws: WebSocket, id: string) {
    log('discovery connection')
    this.peers[id] = ws

    ws.on('message', this.receiveDiscoveryMessage(id))
    ws.on('close', this.closeDiscoveryConnection(id))
  }

  receiveDiscoveryMessage(id: string) {
    const send = (id: string, message: Message) => {
      if (this.peers[id]) {
        this.peers[id].send(JSON.stringify(message))
      } else {
        log('error - trying to send to bad peer', id)
      }
    }

    const applyPeers = (id: string, join?: string[], leave?: string[]) => {
      this.peerIds[id] = mergeUnique(this.peerIds[id], join, leave)
    }

    const notifyIntersections = (id1: string) => {
      const getIntersection = (id1: string, id2: string) => {
        if (id1 === id2) return
        const peerIds1: string[] = this.peerIds[id1] || []
        const peerIds2: string[] = this.peerIds[id2] || []
        const intersection = peerIds1.filter(val => peerIds2.includes(val))
        if (intersection.length > 0) return intersection
      }

      for (const id2 in this.peers) {
        const intersection = getIntersection(id1, id2)
        if (intersection) {
          send(id1, { type: 'Connect', peerId: id2, peerChannels: intersection })
          send(id2, { type: 'Connect', peerId: id1, peerChannels: intersection })
        }
      }
    }

    return (data: Data) => {
      const msg = JSON.parse(data.toString())
      log('message', msg)
      applyPeers(id, msg.join, msg.leave)
      notifyIntersections(id)
    }
  }

  closeDiscoveryConnection(id: string) {
    return () => {
      delete this.peers[id]
      delete this.peerIds[id]
    }
  }

  // PEER CONNECTIONS

  connectPeers(socket1: WebSocket, peer1: string, peer2: string, id: string) {
    const key1 = `${peer1}:${peer2}:${id}`
    const key2 = `${peer2}:${peer1}:${id}`

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

  listen() {
    app.get('/', (req, res, next) => {
      log('get /')
      res.send('@cevitxe/signal-server')
      res.end()
    })

    app.ws('/discovery/:id', (_ws, { params: { id } }) => {
      // TODO: fix types ( @types/express-ws references an older version)
      const ws = (_ws as any) as WebSocket
      this.openDiscoveryConnection(ws, id)
    })

    app.ws('/connect/:peer1/:peer2/:id', (_ws, { params: { peer1, peer2, id } }) => {
      // TODO: fix types ( @types/express-ws references an older version) asdf
      const ws = _ws as WebSocket
      this.connectPeers(ws, peer1, peer2, id)
    })

    app.listen(this.port, '0.0.0.0', () => {
      console.log(`Listening at http://localhost:${this.port}`)
    })
  }
}
