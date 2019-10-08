import A from 'automerge'

type Clock = Map<string, number>

// export const REQUEST_INDEX = 'REQUEST_INDEX'
export const SEND_INDEX = 'SEND_INDEX'

// export const SEND_SNAPSHOTS = 'SEND_SNAPSHOTS'
// export const SEND_HISTORIES = 'SEND_HISTORIES'



export const REQUEST_DOC = 'REQUEST_DOC'
export const ADVERTISE_DOC = 'ADVERTISE_DOC'
export const REQUEST_CHANGES = 'REQUEST_CHANGES'
export const SEND_CHANGES = 'SEND_CHANGES'
// export const SEND_ALL_CHANGES = 'SEND_ALL_CHANGES'
// export const SEND_SNAPSHOT = 'SEND_SNAPSHOT'
// export const SEND_ALL_SNAPSHOTS = 'SEND_ALL_SNAPSHOTS'

// /**
//  * Initializing repo from the network, get everything (snapshots and changes)
//  */
// interface RequestIndexMessage {
//   type: typeof REQUEST_INDEX
// }

/**
 * Initializing a new document from the netwrok, get everything (snapshot and changes)
 */
interface RequestDocMessage {
  type: typeof REQUEST_DOC
  documentId: string
  clock: {}
}

/**
 * Expose available changes
 */
interface AdvertiseDocMessage {
  type: typeof ADVERTISE_DOC
  documentId: string
  clock: Clock
}

/**
 * Request available changes that this client doesn't have
 */
interface RequestChangesMessage {
  type: typeof REQUEST_CHANGES
  documentId: string
  clock: Clock
}

/**
 * Send requested changes for a document
 */
interface SendChangesMessage {
  type: typeof SEND_CHANGES
  documentId: string
  clock: Clock
  changes: A.Change[]
}

// /**
//  * Send all changes for all documents (for initialization)
//  */
// interface SendAllMessage {
//   type: typeof SEND_ALL_CHANGES
//   changes: {
//     documentId: string
//     clock: Clock
//     changes: A.Change[]
//   }[]
// }

// /**
//  * Send snapshot for a document
//  */
// interface SendSnapshotMessage {
//   type: typeof SEND_SNAPSHOT
//   documentId: string
//   snapshot: any
// }

// /**
//  * Send snapshots for all documents
//  */
// interface SendAllSnapshotsMessage {
//   type: typeof SEND_ALL_SNAPSHOTS
//   snapshots: {
//     documentId: string
//     snapshot: any
//   }[]
// }

export type Message =
  // | RequestRepoMessage
  | RequestDocMessage
  | AdvertiseDocMessage
  | RequestChangesMessage
  | SendChangesMessage
  // | SendAllMessage
  // | SendSnapshotMessage
  // | SendAllSnapshotsMessage
