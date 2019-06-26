import automerge from 'automerge'
import { Instance as Peer } from 'simple-peer'
import debug from './debug'
import { SingleDocSet } from './SingleDocSet'
import { Dispatch, AnyAction } from 'redux'
import { RECEIVE_MESSAGE_FROM_FEED } from './constants'

const log = debug('cevitxe:connection')

// The Connection class wraps an automerge.Connection, which keeps track of communication between us
// and one peer. `automerge.Connection` takes a DocSet.

export class Connection<T = any> {
  private automergeConnection: automerge.Connection<T>
  private peer?: Peer | null | undefined
  private docSet: SingleDocSet<T>
  private dispatch?: Dispatch<AnyAction>

  constructor(docSet: SingleDocSet<T>, peer: Peer, dispatch?: Dispatch<AnyAction>) {
    this.docSet = docSet
    this.peer = peer
    if (dispatch) this.dispatch = dispatch

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
    if (message.changes) {
      if (this.dispatch) {
        this.dispatch({
          type: RECEIVE_MESSAGE_FROM_FEED,
          payload: {
            connection: this.automergeConnection,
            message,
          },
        })
      } else {
        this.automergeConnection.receiveMsg(message as automerge.Message<T>) // this updates the doc
      }
    } else {
      this.automergeConnection.receiveMsg(message as automerge.Message<T>) // this updates the doc
    }
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
