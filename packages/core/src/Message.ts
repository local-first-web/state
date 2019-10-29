import A from 'automerge'
import { RepoSnapshot, RepoHistory, Clock, ClockMap } from './types'

/** Kick off our interaction with a peer by telling them how many documents we have */
export const HELLO = 'HELLO'
export interface HelloMessage {
  type: typeof HELLO
  documentCount: number
}

/** Request a document we don't have (snapshot and changes) */
export const REQUEST_DOCS = 'REQUEST_DOCS'
export interface RequestDocsMessage {
  type: typeof REQUEST_DOCS
  documentIds: string[]
}

/** Advertise new document */
export const ADVERTISE_DOCS = 'ADVERTISE_DOCS'
export interface AdvertiseDocsMessage {
  type: typeof ADVERTISE_DOCS
  clocks: {
    documentId: string
    clock: Clock
  }[]
}

/** Send requested changes for a document */
export const SEND_CHANGES = 'SEND_CHANGES'
export interface SendChangesMessage {
  type: typeof SEND_CHANGES
  documentId: string
  clock: Clock
  changes: A.Change[]
}

/** Initializing repo from the network, request everything peer has (snapshots and changes) */
export const REQUEST_ALL = 'REQUEST_ALL'
export interface RequestAllMessage {
  type: typeof REQUEST_ALL
}

/** Send all changes for all documents (for initialization) */
export const SEND_ALL_HISTORY = 'SEND_ALL_HISTORY'
interface SendAllHistoryMessage {
  type: typeof SEND_ALL_HISTORY
  history: RepoHistory
}

/** Send snapshot for a document */
export const SEND_SNAPSHOTS = 'SEND_SNAPSHOTS'
interface SendSnapshotsMessage {
  type: typeof SEND_SNAPSHOTS
  snapshots: {
    documentId: string
    snapshot: any
  }[]
}

/** Send snapshots for all documents */
export const SEND_ALL_SNAPSHOTS = 'SEND_ALL_SNAPSHOTS'
interface SendAllSnapshotsMessage {
  type: typeof SEND_ALL_SNAPSHOTS
  state: RepoSnapshot
  clocks: ClockMap
}

export type Message =
  | HelloMessage
  | RequestDocsMessage
  | AdvertiseDocsMessage
  | SendChangesMessage
  | RequestAllMessage
  | SendAllHistoryMessage
  | SendSnapshotsMessage
  | SendAllSnapshotsMessage
