import { debug, DebuggerDeluxe } from 'debug-deluxe'
import { Duplex } from 'stream'
import WebSocket from './WebSocket'

export default class WebSocketStream extends Duplex {
  socket: WebSocket
  ready: Promise<this>
  tag: string
  log: DebuggerDeluxe

  constructor(url: string, tag: string) {
    super()

    this.log = debug(`cevitxe:signal-client:wsstream:${this.tag}`)

    this.socket = new WebSocket(url)

    this.ready = new Promise(ready => {
      this.socket.addEventListener('open', () => {
        this.log('socket open')
        this.emit('open', this)
        ready(this)
      })
    })

    this.socket.addEventListener('close', () => {
      this.log('socket.onclose')
      this.destroy()
    })

    this.socket.addEventListener('error', err => {
      this.log('socket.onerror', err)
      this.emit('error', err)
    })

    this.socket.addEventListener('message', event => {
      const data = Buffer.from(event.data)
      this.log('socket.onmessage', data)
      this.emit('message', data.toString())
      if (!this.push(data)) {
        this.log('closed, cannot write')
        this.socket.close()
      }
    })
  }

  get isOpen() {
    return this.socket.readyState === WebSocket.OPEN
  }

  _write(data: Buffer, _: unknown, cb: (error?: Error) => void) {
    if (this.isOpen) {
      this.socket.send(data)
      cb()
    } else {
      cb(new Error(`socket[${this.tag}] is closed, cannot write.`))
    }
  }

  _read() {
    // Reading is done async
  }

  _destroy(err: Error | null, cb: (error: Error | null) => void) {
    this.log('_destroy', err)

    super._destroy(err, cb)

    this.socket.close()
  }
}
