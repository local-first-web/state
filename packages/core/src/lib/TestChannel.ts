import { EventEmitter } from 'events'
import { Message } from '../types'

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
  write(id: string, msg: Message) {
    this.emit('data', id, msg)
  }
}
