import automerge, { Message } from 'automerge'
import { automergify } from './automergify'
import uuid from 'uuid'

// The Connection class wraps an automerge.Connection, which keeps track of communication between us
// and one peer. `automerge.Connection` takes a DocSet; we're only dealing with one document, so we
// track a document with a single
export class Connection<T = any> {
  private automergeConnection: automerge.Connection<T>
  private peer?: NodeJS.ReadWriteStream | null | undefined
  private docSet: automerge.DocSet<T>
  private docId: string

  constructor(doc: T, peer?: NodeJS.ReadWriteStream) {
    this.docId = uuid()
    this.docSet = new automerge.DocSet()

    this.docSet.setDoc(this.docId, doc)

    this.peer = peer

    this.automergeConnection = new automerge.Connection(this.docSet, this.send)
    this.automergeConnection.open()
  }

  public get state(): T {
    return this.docSet.getDoc(this.docId)
  }

  public receive(message: Message<T>) {
    message.docId = this.docId
    this.automergeConnection.receiveMsg(message) // this updates the doc
  }

  public send(message: Message<T>) {
    message.docId = this.docId
    if (!this.peer) return
    this.peer.write(JSON.stringify(message))
  }

  public close() {
    if (!this.peer) return
    this.peer.end()
    this.peer = null
  }
}
