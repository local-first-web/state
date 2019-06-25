import automerge from 'automerge'
import { Instance as Peer } from 'simple-peer'
import debug from './debug'
import { SingleDocSet } from './SingleDocSet'

const log = debug('cevitxe:connection')

// The Connection class wraps an automerge.Connection, which keeps track of communication between us
// and one peer. `automerge.Connection` takes a DocSet.

export class Connection<T = any> {
  private automergeConnection: automerge.Connection<T>
  private peer?: Peer | null | undefined
  private docSet: SingleDocSet<T>

  constructor(docSet: SingleDocSet<T>, peer: Peer) {
    this.docSet = docSet
    this.peer = peer

    this.peer.on('data', (data: any) => {
      const message = JSON.parse(data.toString())
      this.receive(message)
    })

    this.automergeConnection = new automerge.Connection(this.docSet.base, this.send)
    this.automergeConnection.open()
  }

  public get state(): T {
    return this.docSet.get()
  }

  receive = (message: automerge.Message<T>) => {
    const myDoc = this.docSet.get()
    log('receive', message, myDoc)
    this.automergeConnection.receiveMsg(message as automerge.Message<T>) // this updates the doc
  }

  send = (message: automerge.Message<T>) => {
    log('send', message)
    if (!this.peer) return
    this.peer.send(JSON.stringify(message))
  }

  close = () => {
    if (!this.peer) return
    this.peer.destroy()
    this.peer = null
  }
}
