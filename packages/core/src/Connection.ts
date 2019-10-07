import debug from 'debug'
import { EventEmitter } from 'events'
import { AnyAction, Dispatch } from 'redux'
import { RECEIVE_MESSAGE_FROM_PEER } from './constants'
import { Repo } from './Repo'
import { RepoSync } from './RepoSync'
import { Message } from './Message'

const log = debug('cevitxe:connection')

/**
 * A `Connection` keeps one local document synchronized with one peer's replica of the same
 * document. It uses `RepoSync` for the synchronization logic, and integrates it with Cevitxe's
 * networking stack and with the Redux store.
 */
export class Connection extends EventEmitter {
  private repoSync: RepoSync
  private peerSocket: WebSocket | null
  private dispatch?: Dispatch<AnyAction>
  private repo: Repo<any>

  constructor(repo: Repo<any>, peerSocket: WebSocket, dispatch?: Dispatch<AnyAction>) {
    super()
    log('new connection')
    this.repo = repo
    this.peerSocket = peerSocket
    if (dispatch) this.dispatch = dispatch

    this.peerSocket.onmessage = this.receive.bind(this)

    this.repoSync = new RepoSync(this.repo, this.send)
    this.repoSync.open().then(() => this.emit('ready'))
  }

  receive = async ({ data }: any) => {
    const message = JSON.parse(data.toString())
    log('receive %o', message)
    this.emit('receive', message)
    await this.repoSync.receive(message) // this updates the doc
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
