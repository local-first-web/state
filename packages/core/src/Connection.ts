import A from './lib/automerge'
import { DocSetSync } from './DocSetSync'
import debug from 'debug'
import { AnyAction, Dispatch } from 'redux'
import { RECEIVE_MESSAGE_FROM_PEER } from './constants'
import { Message } from './types'
import { EventEmitter } from 'events'

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
  private docSet: A.DocSet<any>

  constructor(docSet: A.DocSet<any>, peerSocket: WebSocket, dispatch?: Dispatch<AnyAction>) {
    super()
    log('new connection')
    this.docSet = docSet
    this.peerSocket = peerSocket
    if (dispatch) this.dispatch = dispatch

    this.peerSocket.onmessage = this.receive.bind(this)

    this.docSetSync = new DocSetSync(this.docSet, this.send)
    this.docSetSync.open()
  }

  public get state(): T {
    const _state: Partial<T> = {}
    let key: keyof T
    for (key of this.docSet.docIds as (keyof T)[]) {
      _state[key] = this.docSet.getDoc(key as string) as T[keyof T]
    }
    return _state as T
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
