import { EventEmitter } from 'events'
import { Message } from './Message'
import { ConnectionEvent } from 'types'

const { DATA } = ConnectionEvent

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
      for (const { id, msg } of this.buffer) {
        this.emit(DATA, id, msg)
      }
      this.buffer = []
    }
  }

  write(id: string, msg: Message) {
    if (this.peers > 1) {
      this.emit(DATA, id, msg)
    } else {
      this.buffer.push({ id, msg })
    }
  }
}
