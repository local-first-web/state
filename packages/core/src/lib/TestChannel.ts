import { EventEmitter } from 'events'
import { Message } from '../types'
export class TestChannel extends EventEmitter {
  write(id: string, msg: Message) {
    this.emit('data', id, msg)
  }
}
