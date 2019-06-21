import automerge, { Message } from 'automerge'

const DOC_ID = '1'

export class Connection<T = any> {
  private automergeConnection: automerge.Connection<T>
  private peer?: NodeJS.ReadWriteStream | null | undefined
  private docSet: automerge.DocSet<T>

  constructor(doc: T, peer?: NodeJS.ReadWriteStream) {
    this.docSet = new automerge.DocSet()
    this.docSet.setDoc(DOC_ID, doc)
    this.automergeConnection = new automerge.Connection(this.docSet, this.send)
    this.peer = peer
    this.automergeConnection.open()
  }

  public get state(): T {
    return this.docSet.getDoc(DOC_ID)
  }

  receive(message: Message<T>) {
    message.docId = DOC_ID
    this.automergeConnection.receiveMsg(message) // this updates the docSet
  }

  send(message: Message<T>) {
    message.docId = DOC_ID
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
