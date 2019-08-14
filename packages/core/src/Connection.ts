import A from 'automerge'
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

    // @ts-ignore
    this.docSetSync = new DocSetSync(this.docSet, this.send)
    this.docSetSync.open()
  }

  public get state(): T {
    const _state: Partial<T> = {}
    let key: keyof T
    // get rid of next line when automerge v0.13 is published
    // @ts-ignore
    for (key of this.docSet.docIds) {
      _state[key] = this.docSet.getDoc(key as string)
    }
    return _state as T
  }

  receive = ({ data }: any) => {
    const message = JSON.parse(data.toString())
    log('receive %o', message)
    this.emit('receive', message)
    if (message.changes) {
      log('%s changes received', message.changes.length)
      if (this.dispatch) {
        this.dispatch({
          type: RECEIVE_MESSAGE_FROM_PEER,
          payload: {
            connection: this.docSetSync,
            message,
          },
        })
      } else {
        // TODO: figure out a way to pass a fake dispatcher or something for testing
        log(`temp - only for use by testing without passing a dispatcher`)
        this.docSetSync.receive(message) // this updates the doc
      }
    } else {
      log(`no changes, catch up with peer`)
      this.docSetSync.receive(message) // this updates the doc
    }
  }

  send = (message: Message) => {
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
