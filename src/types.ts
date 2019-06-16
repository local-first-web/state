import { Reducer, Middleware, AnyAction } from 'redux'

export type ProxyReducer<T> = (action: AnyAction) => ChangeFn<T> | null

export interface CreateStoreOptions {
  // Redux store
  proxyReducer: ProxyReducer<any>
  preloadedState?: any
  middlewares?: Middleware[] // TODO: accept an `enhancer` object instead

  // hypercore feed options
  key: string
  secretKey: string
  databaseName?: string
  peerHubs?: string[]
}

export type ReducerConverter = <T>(proxy: ProxyReducer<T>) => Reducer

// stand-ins for Automerge types
export type ChangeFn<T> = (doc: T) => void
export interface Change {}

// TODO: sort out the type for feed
// after building, can't get it to pick up the Feed type from the ambient hypercore types
export type MiddlewareFactory = (feed: any) => Middleware
// export type MiddlewareFactory = (feed: Feed<string>) => Middleware
