import { EventEmitter } from 'events'
import { Message } from '../Message'
import debug from 'debug'

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
  addPeer() {
    this.peers++
    if (this.peers > 1) {
      log('sending buffer')
      for (const { id, msg } of this.buffer) {
        log('emitting', id, msg)
        this.emit('data', id, msg)
      }
      this.buffer = []
    }
  }
  private peers: number = 0
  private buffer: { id: string; msg: Message }[] = []
  write(id: string, msg: Message) {
    if (this.peers > 1) {
      log('emitting', id, msg)
      this.emit('data', id, msg)
    } else {
      log('buffering', id, msg)
      this.buffer.push({ id, msg })
    }
  }
}
