import automerge, { DocSet, Message } from 'automerge'
import { Reducer } from 'redux'
import { APPLY_MESSAGE_FROM_FEED, INITIALIZE } from './constants'

import { CevitxeConnection } from './connection'

export const feedReducer: Reducer = (state: DocSet<any>, { type, payload }) => {
  if (state === undefined) return {}
  switch (type) {
    case APPLY_MESSAGE_FROM_FEED: {
      // After setting up the feed in `createStore`, we listen to our connections and dispatch
      // the incoming messages to our store. This is the reducer that handles those dispatches.

      const { message, connection } = payload as { message: Message<any>; connection: CevitxeConnection }

      connection.receive(message)
      return connection.docSet
    }
    default:
      return state
  }
}
