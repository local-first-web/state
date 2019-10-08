import { Map } from 'immutable'
import A from 'automerge'

type Clock = Map<string, number>

/**
 * Initializing a new document from the network, get everything (snapshot and changes)
 */
export const REQUEST_DOC = 'REQUEST_DOC'
export interface RequestDocMessage {
  type: typeof REQUEST_DOC
  documentId: string
  clock: {}
}

/**
 * Advertise new document
 */
export const ADVERTISE_DOC = 'ADVERTISE_DOC'
export interface AdvertiseDocMessage {
  type: typeof ADVERTISE_DOC
  documentId: string
  clock: Clock
}

/**
 * Send requested changes for a document
 */
export const SEND_CHANGES = 'SEND_CHANGES'
export interface SendChangesMessage {
  type: typeof SEND_CHANGES
  documentId: string
  clock: Clock
  changes: A.Change[]
}

/**
 * Initializing repo from the network, request everything peer has (snapshots and changes)
 */
export const REQUEST_ALL = 'REQUEST_ALL'
export interface RequestAllMessage {
  type: typeof REQUEST_ALL
}

/**
 * Send all changes for all documents (for initialization)
 */
export const SEND_ALL_CHANGES = 'SEND_ALL_CHANGES'
interface SendAllChangesMessage {
  type: typeof SEND_ALL_CHANGES
  changes: {
    documentId: string
    clock: Clock
    changes: A.Change[]
  }[]
}

/**
 * Send snapshot for a document
 */
export const SEND_SNAPSHOT = 'SEND_SNAPSHOT'
interface SendSnapshotMessage {
  type: typeof SEND_SNAPSHOT
  documentId: string
  snapshot: any
}

/**
 * Send snapshots for all documents
 */
export const SEND_ALL_SNAPSHOTS = 'SEND_ALL_SNAPSHOTS'
interface SendAllSnapshotsMessage {
  type: typeof SEND_ALL_SNAPSHOTS
  snapshots: {
    documentId: string
    snapshot: any
  }[]
}

export type Message =
  | RequestDocMessage
  | AdvertiseDocMessage
  | SendChangesMessage
  | RequestAllMessage
  | SendAllChangesMessage
  | SendSnapshotMessage
  | SendAllSnapshotsMessage
