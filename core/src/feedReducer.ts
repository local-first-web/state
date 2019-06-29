import A from 'automerge'
import { Reducer, AnyAction } from 'redux'
import { RECEIVE_MESSAGE_FROM_PEER } from './constants'

interface ReceiveMessagePayload<T> {
  message: A.Message<any>
  connection: A.Connection<T>
}

export const feedReducer: Reducer = <T>(state: T, { type, payload }: AnyAction) => {
  switch (type) {
    case RECEIVE_MESSAGE_FROM_PEER: {
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
