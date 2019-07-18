import A from 'automerge'
import { Peer } from 'cevitxe-signal-client'
import { debug } from 'debug-deluxe'
import { SingleDocSet } from './SingleDocSet'
import { Dispatch, AnyAction } from 'redux'
import { RECEIVE_MESSAGE_FROM_PEER } from './constants'

const log = debug('cevitxe:connection')

// The Connection class wraps an automerge.Connection, which keeps track of communication between us
// and one peer. `automerge.Connection` takes a DocSet.

/* 

Scribbles from Diego & Herb's conversation

A -- B
|    |
D -- C

A action "adds test"
  document v1 -> v2
sent "changeset" to B and D
Both B and D merge the changeset and are now at A.v2 (plus whatever v of their own)
B and D determine C is at A.v1 so they both send the changes
  C might receive them in any order; it will only apply the first one because they are essentially
  the same


 */
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
    log('constructor: onReceive', this.onReceive)

    // TODO: This will change to `.on('message')
    // DM: actually, that would happen on a socket. We need to retrieve one.
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
        // TODO: figure out a way to pass a fake dispatcher or something for testing
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
        // TODO: This *should* work as-is with signal-client
        // DM: it doesn't, because peer does not send. You need to .get a specific socket. But where's the key?
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
