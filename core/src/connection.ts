import A from 'automerge'
import { Instance as Peer } from 'simple-peer'
import debug from 'debug-deluxe'
import { SingleDocSet } from './SingleDocSet'
import { Dispatch, AnyAction } from 'redux'
import { RECEIVE_MESSAGE_FROM_PEER } from './constants'

const log = debug('cevitxe:connection')

// The Connection class wraps an automerge.Connection, which keeps track of communication between us
// and one peer. `automerge.Connection` takes a DocSet.

export class Connection<T = any> {
  private AConnection: A.Connection<T>
  private peer?: Peer | null | undefined
  private docSet: SingleDocSet<T>
  private dispatch?: Dispatch<AnyAction>
  private onReceive?: Function

  constructor(
    docSet: SingleDocSet<T>,
    peer: Peer,
    dispatch?: Dispatch<AnyAction>,
    onReceive?: Function
  ) {
    this.docSet = docSet
    this.peer = peer
    if (dispatch) this.dispatch = dispatch
    if (onReceive) this.onReceive = onReceive
    log('connection constr: onReceive', this.onReceive)

    this.peer.on('data', (data: any) => {
      const message = JSON.parse(data.toString())
      this.receive(message)
    })

    this.AConnection = new A.Connection(this.docSet.base, this.send)
    this.AConnection.open()
  }

  public get state(): T {
    return this.docSet.get()
  }

  receive = (message: A.Message<T>) => {
    const myDoc = this.docSet.get()
    log('receive', message, myDoc)
    if (message.changes) {
      log('changes received', message.changes)
      if (this.dispatch) {
        this.dispatch({
          type: RECEIVE_MESSAGE_FROM_PEER,
          payload: {
            connection: this.AConnection,
            message,
          },
        })
      } else {
        // TODO: figure out a way to pass a fake dispatcher or something
        log(`temp - only for use by testing without passing a dispatcher`)
        this.AConnection.receiveMsg(message as A.Message<T>) // this updates the doc
      }
      if (this.onReceive) {
        log('changes, calling onReceive')
        this.onReceive(message)
      }
    } else {
      log(`no changes, catch up with peer`)
      this.AConnection.receiveMsg(message as A.Message<T>) // this updates the doc
    }
  }

  send = (message: A.Message<T>) => {
    log('send', message)
    if (this.peer)
      try {
        this.peer.send(JSON.stringify(message))
      } catch {
        log('tried to send but peer is no longer connected', this.peer)
      }
  }

  close = () => {
    if (!this.peer) return
    this.peer.destroy()
    this.peer = null
  }
}
