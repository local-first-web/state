import A from 'automerge'
import { DocumentSync } from './DocumentSync'
import debug from 'debug'
import { AnyAction, Dispatch } from 'redux'
import { RECEIVE_MESSAGE_FROM_PEER } from './constants'
import { Message } from './types'

const log = debug('cevitxe:connection')

/**
 * The Connection keeps a local document synchronized with a peer's replica of the same document. It
 * wraps a `DocumentSync`, which takes care of the synchronization logic, and integrates it with
 * Cevitxe's networking stack and with the Redux store.
 */
export class Connection<T = any> {
  private DocumentSync: DocumentSync<T>
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

    this.DocumentSync = new DocumentSync(this.watchableDoc, this.send)
    this.DocumentSync.open()
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
            connection: this.DocumentSync,
            message,
          },
        })
      } else {
        // TODO: figure out a way to pass a fake dispatcher or something for testing
        log(`temp - only for use by testing without passing a dispatcher`)
        this.DocumentSync.receive(message) // this updates the doc
      }

      if (this.onReceive) {
        log('changes, calling onReceive')
        this.onReceive(message)
      }
      
    } else {
      log(`no changes, catch up with peer`)
      this.DocumentSync.receive(message) // this updates the doc
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
