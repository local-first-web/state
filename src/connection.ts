import automerge, { Message } from 'automerge'
import { Buffer } from 'buffer'

export class CevitxeConnection {
  private automergeConnection: automerge.Connection<any>
  private peer?: NodeJS.ReadWriteStream | null | undefined

  docSet: automerge.DocSet<any>

  constructor(docSet: automerge.DocSet<any>, peer?: NodeJS.ReadWriteStream) {
    this.docSet = docSet
    this.automergeConnection = new automerge.Connection(docSet, this.send)
    this.peer = peer
    this.automergeConnection.open()
  }

  receive(message: Message<any>) {
    this.automergeConnection.receiveMsg(message)
  }

  send(message: Message<any>) {
    if (!this.peer) return
    const data = JSON.stringify(message)
    this.peer.write(data)
  }

  close() {
    if (!this.peer) return
    this.peer.end()
    this.peer = null
  }
}
