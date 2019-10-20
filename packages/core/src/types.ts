import A from 'automerge'
import { AnyAction } from 'redux'

export type ProxyReducer = (state: any, action: AnyAction) => ChangeMap | null

/**
 * Associates documentIds with a change function to be executed by the reducer.
 */
export interface ChangeMap {
  [documentId: string]: A.ChangeFn<any> | symbol
}

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

export interface Snapshot<T = any> {
  [key: string]: T
}

/**
 * `RepoSnapshot` is a plain JavaScript representation of a repo's contents. It is an object, each
 * property of which is also an object; so any primitive values or arrays need to be nested a couple
 * of levels in.
 */
export interface RepoSnapshot<T = any> {
  [documentId: string]: T | null
}

/**
 * A `ChangeSet` is what we record in our storage feed.
 */
export interface ChangeSet {
  /** The ID of the document */
  documentId: string
  /** One or more Automerge changes made to the document */
  changes: A.Change[]
}

/**
 * `RepoHistory` is an object mapping documentIds to the corresponding document's entire change history.
 */
export type RepoHistory = {
  [documentId: string]: A.Change[]
}
