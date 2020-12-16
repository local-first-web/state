import debug from 'debug'
import { EventEmitter } from 'events'
import { AnyAction, Dispatch } from 'redux'
import { RECEIVE_MESSAGE_FROM_PEER } from './constants'
import { Repo } from './Repo'
import { Synchronizer } from './Synchronizer'
import { Message } from './Message'

const log = debug('cevitxe:connection')

/*

Since one Connection has exactly one Synchronizer and nothing else talks to a Synchronizer, 
maybe it makes sense to merge these two objects? 

A Connection needs 
- a WebSocket 
  - the WebSocket has a peer at the other end
  - when a message is received from the WebSocket, the Synchronizer handles it
- a Repo 
  - the Repo tells the Connection about local changes
  - the Connection tells the Repo about remote changes
- a Dispatch function (from a Redux store)
  - the Connection calls the Dispatch function to notify the store about remote changes

Internally the connection creates a Synchronizer
- the Synchronizer guarantees that our Repo and the peer's Repo will eventually have the same contents



*/

/**
 * A `Connection` keeps one local document synchronized with one peer's replica of the same
 * document. It uses `Synchronizer` for the synchronization logic, and integrates it with Cevitxe's
 * networking stack and with the Redux store.
 */
export class Connection extends EventEmitter {
  private synchronizer: Synchronizer
  private peerSocket: WebSocket | null
  private dispatch: Dispatch<AnyAction>
  private repo: Repo<any>

  constructor(repo: Repo<any>, peerSocket: WebSocket, dispatch: Dispatch<AnyAction>) {
    super()
    log('new connection')
    this.repo = repo
    this.peerSocket = peerSocket
    this.dispatch = dispatch

    this.peerSocket.onmessage = this.receive.bind(this)

    this.synchronizer = new Synchronizer(this.repo, this.send)
    this.synchronizer.open().then(() => this.emit('ready'))
  }

  receive = async ({ data }: any) => {
    const message = JSON.parse(data.toString())
    log('receive %o', message)
    this.emit('receive', message)
    await this.synchronizer.receive(message) // Synchronizer will update repo directly

    // TODO: This seems janky
    // hit the dispatcher to force it to pick up
    this.dispatch({ type: RECEIVE_MESSAGE_FROM_PEER })
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
