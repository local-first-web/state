import A from 'automerge'
import { AnyAction, Middleware, Reducer, Store } from 'redux'
import { SingleDocSet } from './SingleDocSet'
// import { Feed } from 'hypercore'

export type ProxyReducer<T> = (action: AnyAction) => A.ChangeFn<T> | null
export type ReducerConverter = <T>(proxy: ProxyReducer<T>) => Reducer

export interface CevitxeOptions<T> {
  // Redux store
  proxyReducer: ProxyReducer<any>
  middlewares?: Middleware[] // TODO: accept an `enhancer` object instead
  initialState: T

  onReceive?: Function

  // hypercore feed options
  databaseName: string
  peerHubs?: string[]
}

export interface CreateStoreResult {
  feed: any //Feed<string>
  store: Store
}

// TODO: sort out the type for feed after building, can't get it to pick up the Feed type from the ambient hypercore types
export type MiddlewareFactory = <T>(feed: any, docSet: SingleDocSet<T | {}>) => Middleware // feed: Feed<string>

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

// Our connection class has a single document with a fixed `docId`, so the messages we pass to it don't need to have that field
export type Message<T> = PartialBy<A.Message<T>, 'docId'>

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export interface ReceiveMessagePayload<T> {
  message: A.Message<any>
  connection: A.Connection<T>
}
