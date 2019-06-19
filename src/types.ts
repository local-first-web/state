import { Reducer, Middleware, AnyAction, DeepPartial, Store } from 'redux'

export type ProxyReducer<T> = (action: AnyAction) => ChangeFn<T> | null

export interface CreateStoreOptions<T> {
  // Redux store
  proxyReducer: ProxyReducer<any>
  defaultState: T
  middlewares?: Middleware[] // TODO: accept an `enhancer` object instead

  discoveryKey: string

  // hypercore feed options
  databaseName?: string
  peerHubs?: string[]
}

export interface CevitxeStore {
  store: Store
  key: string
  secretKey: string
}

export type ReducerConverter = <T>(proxy: ProxyReducer<T>) => Reducer

// TODO: replace these with the real automerge types?
// stand-ins for Automerge types
export type ChangeFn<T> = (doc: T) => void
export interface Change {}

// TODO: sort out the type for feed
// after building, can't get it to pick up the Feed type from the ambient hypercore types
export type MiddlewareFactory = (feed: any) => Middleware
// export type MiddlewareFactory = (feed: Feed<string>) => Middleware

// A keychain maps a discovery key (the id we share to the signal server) with a public/private keypair (which we use
// for storage etc). The discovery key can be any string that we think is going to be unique on our signal hub servers.
export interface Keychain {
  [discoveryKey: string]: KeyPair
}

export interface KeyPair {
  key: string
  secretKey: string
}
