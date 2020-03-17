import A from 'automerge'
import { AnyAction } from 'redux'

export type ProxyReducer = (state: any, action: AnyAction) => ChangeMap | A.ChangeFn<any> | null

/**
 * A keychain maps a discovery key (the id we share to the signal server) with a public/private
 * keypair (which we use for storage etc). The discovery key can be any string that we think is
 * going to be unique on our signal hub servers.
 * > Note: we're not currently encrypting anything
 */
export interface Keychain {
  [discoveryKey: string]: KeyPair
}

/**
 * > Note: we're not currently encrypting anything
 */
export interface KeyPair {
  key: CryptoKey
  secretKey: CryptoKey
}

/**
 * A vector clock provides a logical ordering of events and states in a distributed system. It
 *  associates each actor in a system with a counter that is incremented each time that actor makes a
 *  change. See https://en.wikipedia.org/wiki/Vector_clock.
 */
export declare type Clock = {
  [actorId: string]: number
}

/**
 * For each document, we have a `Clock`. A ClockMap maps all documentIds that we have to the
 * corresponding `Clock`. */
export declare type ClockMap = {
  [documentId: string]: Clock
}

/**
 * Associates documentIds with a change function to be executed by the reducer.
 */
export interface ChangeMap {
  [documentId: string]: A.ChangeFn<any> | symbol
}

/**
 * Every time one or more changes are made, we store them in a `ChangeSet`.
 */
export interface ChangeSet {
  /** The ID of the document */
  documentId: string
  /** The name of the collection this ChangeSet applies to */
  collection?: string
  /** One or more Automerge changes made to the document */
  changes: A.Change[]
}

/**
 * `RepoHistory` is an object mapping each `documentId` to an array of changes representing the
 * corresponding document's entire history.
 */
export declare type RepoHistory = {
  [documentId: string]: A.Change[]
}

/**
 * A snapshot is the state of a document at a specific point in time, with no Automerge metadata.
 */
export interface Snapshot {
  [key: string]: any
}

/**
 * `RepoSnapshot` is a plain JavaScript representation of a repo's contents. It is an object, each
 * property of which is also an object; so any primitive values or arrays need to be nested a couple
 * of levels in.
 */
export interface RepoSnapshot {
  [documentId: string]: Snapshot | null
}

/**
 * We store each `Snapshot` along with some metadata in a `SnapshotRecord`.
 */
export interface SnapshotRecord {
  /** The ID of the document */
  documentId: string
  /** The name of the collection this SnapshotRecord applies to */
  collection?: string
  /** The snapshot itself */
  snapshot: Snapshot
  /** The vector clock when the snapshot was taken  */
  clock: Clock
}
