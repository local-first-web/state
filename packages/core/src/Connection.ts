import debug from 'debug'
import { EventEmitter } from 'events'
import { AnyAction, Dispatch } from 'redux'
import { RECEIVE_MESSAGE_FROM_PEER } from './constants'
import { DocSet } from './DocSet'
import { DocSetSync } from './DocSetSync'
import { Message } from './types'

const log = debug('cevitxe:connection')

/**
 * A `Connection` keeps one local document synchronized with one peer's replica of the same
 * document. It uses `DocumentSync` for the synchronization logic, and integrates it with Cevitxe's
 * networking stack and with the Redux store.
 */
export class Connection<T = any> extends EventEmitter {
  private docSetSync: DocSetSync
  private peerSocket: WebSocket | null
  private dispatch?: Dispatch<AnyAction>
  private docSet: DocSet<any>

  constructor(docSet: DocSet<any>, peerSocket: WebSocket, dispatch?: Dispatch<AnyAction>) {
    super()
    log('new connection')
    this.docSet = docSet
    this.peerSocket = peerSocket
    if (dispatch) this.dispatch = dispatch

    this.peerSocket.onmessage = this.receive.bind(this)

    this.docSetSync = new DocSetSync(this.docSet, this.send) // TODAY: replace with repo
    this.docSetSync.open()
  }

  receive = ({ data }: any) => {
    const message = JSON.parse(data.toString())
    log('receive %o', message)
    this.emit('receive', message)
    this.docSetSync.receive(message) // this updates the doc
    if (message.changes) {
      log('%s changes received', message.changes.length)
      if (this.dispatch) {
        // dispatch the changes from the peer for middleware to write them to local feed
        this.dispatch({
          type: RECEIVE_MESSAGE_FROM_PEER,
          payload: {
            message,
          },
        })
      }
    }
  }

  send = (message: Message) => {
    log('send %o', JSON.stringify(message))
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
