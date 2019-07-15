import _WebSocket from 'ws'

// This file is only imported by node, but not webpack
export default class WebSocket extends _WebSocket {
  constructor(url: string) {
    super(url)
    this.binaryType = 'arraybuffer'
  }
}
