import { ProxyReducer } from '@cevitxe/core'
import { State } from '../types'

// Constants
export const CHAT_ADD_MESSAGE = 'CHAT_ADD_MESSAGE'

// Action creators
export const addChatMessage = (message: string) => ({
  type: CHAT_ADD_MESSAGE,
  payload: { message },
})

// Reducer
export const proxyReducer: ProxyReducer<State> = ({ type, payload }) => {
  switch (type) {
    case CHAT_ADD_MESSAGE:
      return s => {
        s.messages.push(payload.message)
      }

    default:
      return null
  }
}
