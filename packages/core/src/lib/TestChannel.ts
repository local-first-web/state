import { EventEmitter } from 'events'
import { Message } from '../types'
export class TestChannel<T> extends EventEmitter {
  write(id: string, msg: Message<T>) {
    this.emit('data', id, msg)
  }
}
