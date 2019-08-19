export const RECEIVE_MESSAGE_FROM_PEER = 'cevitxe/RECEIVE_MESSAGE_FROM_PEER'

export const INITIALIZE = 'cevitxe/INITIALIZE'

export const MSG_INVALID_KEYS =
  'A valid crypto pair, `key` and a `secretKey`, must be provided. ' +
  'The `key` should be a 32-byte hexadecimal value (64 characters). ' +
  'The `secretKey` should be a 64-byte hexadecimal value (128 characters). '

export const DEFAULT_SIGNAL_SERVERS = ['ws://localhost:8080'] // default public signaling server

export const DELETE_COLLECTION = Symbol('DELETE_COLLECTION')
export const DELETE_ITEM = Symbol('DELETE_ITEM')
