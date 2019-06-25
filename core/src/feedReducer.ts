import automerge from 'automerge'
import { Reducer, AnyAction } from 'redux'
import { RECEIVE_MESSAGE_FROM_FEED } from './constants'

interface ReceiveMessagePayload<T> {
  message: automerge.Message<any>
  connection: automerge.Connection<T>
}

export const feedReducer: Reducer = <T>(state: T, { type, payload }: AnyAction): T => {
  switch (type) {
    case RECEIVE_MESSAGE_FROM_FEED: {
      // After setting up the feed in `createStore`, we listen to our connections and dispatch the
      // incoming messages to our store. This is the reducer that handles those dispatches.
      const { message, connection } = payload as ReceiveMessagePayload<T>
      const doc = connection.receiveMsg(message)
      return doc
    }
    default:
      return state
  }
}
