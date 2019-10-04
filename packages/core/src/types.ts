import A from 'automerge'
import { AnyAction, Middleware, Store } from 'redux'
import { DocSet } from './DocSet'
import { DocSetSync } from './DocSetSync'
import { Repo } from './Repo'

export type ProxyReducer = (state: any, action: AnyAction) => ChangeMap | null

export interface ChangeMap {
  [documentId: string]: A.ChangeFn<any> | symbol
}

export interface StoreManagerOptions<T> {
  /** A Cevitxe proxy reducer that returns a ChangeMap (map of change functions) for each action. */
  proxyReducer: ProxyReducer
  /** Redux middlewares to add to the store. */
  middlewares?: Middleware[]
  /** The starting state of a blank document. */
  initialState: DocSetState<T>
  /** A name for the storage feed, to distinguish this application's data from any other Cevitxe data stored on the same machine. */
  databaseName: string
  /** The address(es) of one or more signal servers to try. */
  urls?: string[]
}

export interface CreateStoreResult {
  feed: any //Feed<string>
  store: Store
}

export type MiddlewareFactory = (
  feed: Repo,
  docSet: DocSet<any>,
  proxyReducer: ProxyReducer,
  discoveryKey?: string
) => Middleware

/**
 * A keychain maps a discovery key (the id we share to the signal server) with a public/private
 * keypair (which we use for storage etc). The discovery key can be any string that we think is
 * going to be unique on our signal hub servers.
 */
export interface Keychain {
  [discoveryKey: string]: KeyPair
}

export interface KeyPair {
  key: string
  secretKey: string
}

export interface Message {
  documentId: string
  clock: A.Clock
  changes?: A.Change[]
}

export interface ReceiveMessagePayload {
  message: Message
  connection: DocSetSync
}

/**
 * `DocSetState` is a plain JavaScript representation of a DocSet. It is an object, each property of
 * which is also an object; so any primitive values or arrays need to be nested a couple of levels
 * in.
 */
export interface DocSetState<T = any> {
  [documentId: string]: A.Doc<T>
}

/**
 * A `ChangeSet` is what we record in our storage feed.
 */
export interface ChangeSet {
  /** The ID of the document */
  documentId: string
  /** One or more Automerge changes made to the document */
  changes: A.Change[]
  /** Special flag marking the document for deletion */
  isDelete?: boolean
}
