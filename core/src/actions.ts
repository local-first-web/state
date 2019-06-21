import { Connection } from './connection'
import { Message } from './types'
import { RECEIVE_MESSAGE_FROM_FEED } from './constants'

export const actions = {
  recieveMessage: (message: Message<any>, connection: Connection) => ({
    type: RECEIVE_MESSAGE_FROM_FEED,
    payload: { message, connection, cameFromFeed: true },
  }),
}
