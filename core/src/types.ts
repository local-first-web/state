import automerge from 'automerge'
import { AnyAction, Middleware, Reducer, Store } from 'redux'
import { SingleDocSet } from './SingleDocSet'
export type ProxyReducer<T> = (action: AnyAction) => ChangeFn<T> | null

export interface CevitxeOptions<T> {
  // Redux store
  proxyReducer: ProxyReducer<any>
  middlewares?: Middleware[] // TODO: accept an `enhancer` object instead
  initialState: T

  documentId?: string
  onReceive?: Function

  // hypercore feed options
  databaseName?: string
  peerHubs?: string[]
}

export interface CreateStoreResult {
  feed: Feed<string>
  store: Store
}

export type ReducerConverter = <T>(proxy: ProxyReducer<T>) => Reducer

// TODO: replace these with the real automerge types?
// stand-ins for Automerge types
export type ChangeFn<T> = (doc: T) => void
export interface Change {}

// TODO: sort out the type for feed after building, can't get it to pick up the Feed type from the
// ambient hypercore types
export type MiddlewareFactory = <T>(feed: Feed<string>, docSet: SingleDocSet<T | {}>) => Middleware

// A keychain maps a discovery key (the id we share to the signal server) with a public/private
// keypair (which we use for storage etc). The discovery key can be any string that we think is
// going to be unique on our signal hub servers.
export interface Keychain {
  [documentId: string]: KeyPair
}

export interface KeyPair {
  key: string
  secretKey: string
}

// Our connection class has a single document with a fixed `docId`, so the messages we pass to it
// don't need to have
export type Message<T> = PartialBy<automerge.Message<T>, 'docId'>

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
