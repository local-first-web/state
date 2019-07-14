import { Connection } from './Connection'
import { Message } from './types'
import { RECEIVE_MESSAGE_FROM_PEER } from './constants'

export const actions = {
  recieveMessage: (message: Message<any>, connection: Connection) => ({
    type: RECEIVE_MESSAGE_FROM_PEER,
    payload: { message, connection, cameFromFeed: true },
  }),
}
