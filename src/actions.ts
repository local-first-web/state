import { Change, Message, Connection } from 'automerge'
import { APPLY_CHANGE_FROM_FEED, APPLY_MESSAGE_FROM_FEED } from './constants'
import { CevitxeConnection } from './connection'

export const actions = {
  // applyChange: (change: Change<any>) => ({
  //   type: APPLY_CHANGE_FROM_FEED,
  //   payload: { change, cameFromFeed: true },
  // }),

  applyMessage: (message: Message<any>, connection: CevitxeConnection) => ({
    type: APPLY_MESSAGE_FROM_FEED,
    payload: { message, connection, cameFromFeed: true },
  }),
}
