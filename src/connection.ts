import automerge from 'automerge'
import { Buffer } from 'buffer'

export class CevitxeConnection {
  private connection: automerge.Connection<any>
  private peer: NodeJS.ReadWriteStream | null
  private buffer: Buffer

  constructor (docSet: automerge.DocSet<any>, peer: NodeJS.ReadWriteStream) {
    this.connection = new automerge.Connection(docSet, msg => this.sendMsg(msg))
    this.peer = peer
    this.buffer = Buffer.alloc(0)
    this.connection.open()
  }

  receiveData (data: Buffer) {
    this.buffer = Buffer.concat([this.buffer, data])

    // If there is enough data in the buffer, decode it into messages
    while (true) {
      if (this.buffer.length < 4) break

      const msglen = this.buffer.readInt32BE(0)
      if (this.buffer.length < msglen + 4) break

      const msg = JSON.parse(this.buffer.toString('utf8', 4, msglen + 4))
      this.buffer = this.buffer.slice(msglen + 4)
      //console.log('Received:', msg)
      this.connection.receiveMsg(msg)
    }
  }

  sendMsg (msg: any) {
    if (!this.peer) return
    //console.log('Sending:', msg)
    const data = Buffer.from(JSON.stringify(msg), 'utf8')
    const header = Buffer.alloc(4)
    header.writeInt32BE(data.length, 0)
    this.peer.write(header)
    this.peer.write(data)
  }

  close () {
    if (!this.peer) return
    this.peer.end()
    this.peer = null
  }
}


