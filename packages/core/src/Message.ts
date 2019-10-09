import { Map } from 'immutable'
import A from 'automerge'
import { RepoSnapshot, RepoHistory } from './types'

type Clock = Map<string, number>

/**
 * Request a document we don't have (snapshot and changes)
 */
export const REQUEST_DOC = 'REQUEST_DOC'
export interface RequestDocMessage {
  type: typeof REQUEST_DOC
  documentId: string
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
export const SEND_ALL_HISTORY = 'SEND_ALL_HISTORY'
interface SendAllHistoryMessage {
  type: typeof SEND_ALL_HISTORY
  history: RepoHistory
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
  state: RepoSnapshot
}

export type Message =
  | RequestDocMessage
  | AdvertiseDocMessage
  | SendChangesMessage
  | RequestAllMessage
  | SendAllHistoryMessage
  | SendSnapshotMessage
  | SendAllSnapshotsMessage
