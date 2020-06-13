import { EventEmitter } from 'events'
import { Message } from './Message'
import debug from 'debug'
import { ConnectionEvent } from 'cevitxe-types'

const { DATA } = ConnectionEvent

const log = debug('HIDE:cevitxe:testchannel')
/**
 * Simplest possible communications channel, for testing.
 *
 * Example:
 * ```ts
 * const channel = new TestChannel()
 * channel.on('data', msg => {
 *   console.log(msg)
 * })
 * channel.write('hello, world') // logs 'hello, world'
 * ```
 */
export class TestChannel extends EventEmitter {
  private peers: number = 0
  private buffer: { id: string; msg: Message }[] = []

  addPeer() {
    this.peers++
    if (this.peers > 1) {
      log('sending buffer')
      for (const { id, msg } of this.buffer) {
        log('emitting', id, msg)
        this.emit(DATA, id, msg)
      }
      this.buffer = []
    }
  }

  write(id: string, msg: Message) {
    if (this.peers > 1) {
      log('emitting', id, msg)
      this.emit(DATA, id, msg)
    } else {
      log('buffering', id, msg)
      this.buffer.push({ id, msg })
    }
  }
}
