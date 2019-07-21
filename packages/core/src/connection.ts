import A from 'automerge'
import { AConnection, Message } from './AConnection'
import debug from 'debug'
import { AnyAction, Dispatch } from 'redux'
import { RECEIVE_MESSAGE_FROM_PEER } from './constants'

const log = debug('cevitxe:connection')

// The Connection class wraps an automerge.Connection, which keeps track of communication between us
// and one peer. `automerge.Connection` takes a DocSet.
export class Connection<T = any> {
  private AConnection: AConnection<T>
  private peerSocket: WebSocket | null | undefined
  private dispatch?: Dispatch<AnyAction>
  private watchableDoc: A.WatchableDoc<A.Doc<T>, T>
  private onReceive?: Function

  constructor(
    watchableDoc: A.WatchableDoc<A.Doc<T>, T>,
    peerSocket: WebSocket,
    dispatch?: Dispatch<AnyAction>,
    onReceive?: Function
  ) {
    log('new connection')
    this.watchableDoc = watchableDoc
    this.peerSocket = peerSocket
    if (dispatch) this.dispatch = dispatch
    if (onReceive) this.onReceive = onReceive

    this.peerSocket.onmessage = this.receive.bind(this)

    this.AConnection = new AConnection(this.watchableDoc, this.send)
    this.AConnection.open()
  }

  public get state(): A.Doc<T> {
    return this.watchableDoc.get()
  }

  receive = ({ data }: any) => {
    log('receive %o', data)
    const message = JSON.parse(data.toString())
    if (message.changes) {
      log('%s changes received', message.changes.length)
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
        this.AConnection.receiveMsg(message) // this updates the doc
      }
      if (this.onReceive) {
        log('changes, calling onReceive')
        this.onReceive(message)
      }
    } else {
      log(`no changes, catch up with peer`)
      this.AConnection.receiveMsg(message) // this updates the doc
    }
  }

  send = (message: Message<T>) => {
    log('send %o', message)
    if (this.peerSocket)
      try {
        this.peerSocket.send(JSON.stringify(message))
      } catch {
        log('tried to send but peer is no longer connected', this.peerSocket)
      }
  }

  close = () => {
    if (!this.peerSocket) return
    this.peerSocket.close()
    this.peerSocket = null
  }
}

// TODO incorporate this into documentation
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
