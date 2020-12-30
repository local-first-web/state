import debug from 'debug'
import { EventEmitter } from 'events'
import { AnyAction, Dispatch } from 'redux'
import * as Auth from 'taco-js'
import { RECEIVE_MESSAGE_FROM_PEER } from './constants'
import { Repo } from './Repo'
import { Synchronizer } from './Synchronizer'
import { Message } from './Message'

const log = debug('lf:connection')

/**
 * A `Connection` keeps one local document synchronized with one peer's replica of the same
 * document. It uses `Synchronizer` for the synchronization logic, and integrates it with our
 * networking stack and with the Redux store.
 */
export class Connection extends EventEmitter {
  private team: Auth.Team
  private Synchronizer: Synchronizer
  private peerSocket: WebSocket | null
  private dispatch: Dispatch<AnyAction>
  private repo: Repo<any>

  constructor(team: Auth.Team, repo: Repo<any>, peerSocket: WebSocket, dispatch: Dispatch<AnyAction>) {
    super()
    log('new connection')
    this.team = team
    this.repo = repo
    this.peerSocket = peerSocket
    this.dispatch = dispatch

    this.peerSocket.onmessage = this.receive.bind(this)

    this.Synchronizer = new Synchronizer(this.repo, this.send)
    this.Synchronizer.open().then(() => this.emit('ready'))
  }

  receive = async ({ data }: any) => {
    let message = JSON.parse(data.toString())
    log('receive %o', message)
    if (message.action === 'AUTH:JOIN') {
      const proof = message.payload
      this.team.admit(proof)
      log('admitted user to team')
      this.peerSocket?.send(JSON.stringify({action: 'AUTH:ADMITTED', payload: this.team.chain}))
    } else {
      if (message.action === 'ENCRYPTED') {
        message = JSON.parse(this.team.decrypt(message.envelope))
        if (!this.team.verify(message)) {
          throw new Error('ERROR! Signed with unknown keys')
        }
        message = message.contents
      }
      this.emit('receive', message)
      await this.Synchronizer.receive(message) // Synchronizer will update repo directly
      // hit the dispatcher to force it to pick up
      this.dispatch({ type: RECEIVE_MESSAGE_FROM_PEER })
    }
  }

  send = (message: Message, forcePlaintext = false) => {
    const enc = {
      action: 'ENCRYPTED',
      envelope: this.team.encrypt(this.team.sign(message))
    }

    if (this.peerSocket)
      try {
        if (forcePlaintext) {
          log('send plaintext %o', JSON.stringify(message))
          this.peerSocket.send(JSON.stringify(message))
        } else {
          log('send encrypted %o', JSON.stringify(message))
          this.peerSocket.send(JSON.stringify(enc))
        }
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
