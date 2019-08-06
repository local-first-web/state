import { Map } from 'immutable'
import A from 'automerge'
import { AnyAction, Middleware, Reducer, Store } from 'redux'
import { DocumentSync } from './DocumentSync'

export type ProxyReducer<T> = (action: AnyAction) => A.ChangeFn<T> | null
export type ProxyMultiReducer = (action: AnyAction) => ChangeMap | null
export type ReducerConverter = <T>(proxy: ProxyReducer<T> | ProxyMultiReducer) => Reducer
export type StateFactory<T> = () => T

export interface ChangeMap {
  [documentId: string]: A.ChangeFn<any>
}

export interface CevitxeOptions<T> {
  // Redux store
  proxyReducer: ProxyReducer<any> | ProxyMultiReducer
  middlewares?: Middleware[] // TODO: accept an `enhancer` object instead
  initialState: T | StateFactory<T>

  // hypercore feed options
  databaseName: string
  urls?: string[]
}

export interface CreateStoreResult {
  feed: any //Feed<string>
  store: Store
}

// TODO: sort out the type for feed after building, can't get it to pick up the Feed type from the ambient hypercore types
export type MiddlewareFactory = <T>(
  feed: any,
  watchableDoc: A.WatchableDoc<A.Doc<T>>,
  documentId?: string
) => Middleware // feed: Feed<string>

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

export interface Message {
  clock: Clock
  changes?: A.Change[]
}

export interface ReceiveMessagePayload<T> {
  message: Message
  connection: DocumentSync<T>
}

export type Clock = Map<string, number>
