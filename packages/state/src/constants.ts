// special messages
export const RECEIVE_MESSAGE_FROM_PEER = '@localfirst/state/RECEIVE_MESSAGE_FROM_PEER'
export const INITIALIZE = '@localfirst/state/INITIALIZE'

export const DEFAULT_RELAYS = [`ws://${window.location.hostname}:8080`] // default public relay

// deleted flag
export const DELETED = '__DELETED'

// global documentId
export const GLOBAL = '__global'

// connection events
export const OPEN = 'open'
export const READY = 'ready'
export const CLOSE = 'close'
export const ERROR = 'error'
export const PEER = 'peer'
export const PEER_REMOVE = 'peer_remove'
export const PEER_UPDATE = 'peer_update'
export const MESSAGE = 'message'
export const DATA = 'data'
