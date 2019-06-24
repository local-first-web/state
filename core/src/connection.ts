import automerge from 'automerge'
import { automergify } from './automergify'
import uuid from 'uuid'
import { Message } from './types'
import { DOC_ID } from './constants'
import debug from './debug'

const log = debug('cevitxe:connection')

// The Connection class wraps an automerge.Connection, which keeps track of communication between us
// and one peer. `automerge.Connection` takes a DocSet; we're only dealing with one document, so we
// track a document with a single `docId`.
export class Connection<T = any> {
  private automergeConnection: automerge.Connection<T>
  private peer?: NodeJS.ReadWriteStream | null | undefined
  private docSet: automerge.DocSet<T>

  constructor(docSet: automerge.DocSet<T>, peer: NodeJS.ReadWriteStream) {
    this.docSet = docSet
    this.peer = peer

    this.peer.on('data', (data: any) => {
      console.log('peer data', data)
      const message = JSON.parse(data.toString())
      this.receive(message)
    })

    this.automergeConnection = new automerge.Connection(this.docSet, this.send)
    this.automergeConnection.open()
  }

  public get state(): T {
    return this.docSet.getDoc(DOC_ID)
  }

  receive = (message: automerge.Message<T>) => {
    // this.docSet.setDoc(this.docId, doc)
    const myDoc = this.docSet.getDoc(DOC_ID)
    log('receive', message, myDoc)
    //message.docId = DOC_ID
    this.automergeConnection.receiveMsg(message as automerge.Message<T>) // this updates the doc
  }

  send = (message: automerge.Message<T>) => {
    //message.docId = DOC_ID
    log('send', message)
    if (!this.peer) return
    this.peer.send(JSON.stringify(message))
  }

  close = () => {
    if (!this.peer) return
    this.peer.end()
    this.peer = null
  }
}
