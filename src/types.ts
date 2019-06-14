import { Reducer, Middleware, AnyAction } from 'redux'

export type ProxyReducer<T> = (action: AnyAction) => ChangeFn<T> | null
export type ReducerAdapter = <T>(proxy: ProxyReducer<T>) => Reducer<T | undefined, AnyAction>

// HACK - after building, can't get it to pick up the Feed type from the ambient hypercore types
export type MiddlewareFactory = (feed: any) => Middleware
// export type MiddlewareFactory = (feed: Feed<string>) => Middleware

// stand-ins for Automerge types
type ChangeFn<T> = (doc: T) => void
export interface Change {}

export interface CreateStoreOptions {
  // Redux store
  proxyReducer: ProxyReducer<any>
  preloadedState?: any
  middlewares?: Middleware[]
  // hypercore feed options
  key: string
  secretKey: string
  databaseName?: string
  peerHubs?: string[]
}
