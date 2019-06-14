import { Reducer, Middleware, AnyAction } from 'redux'

export type ProxyReducer<T> = (action: AnyAction) => ChangeFn<T> | null

export type ReducerAdapter = <T>(
  proxy: ProxyReducer<T>
) => Reducer<T | undefined, AnyAction>

// stand-ins for Automerge types
type ChangeFn<T> = (doc: T) => void
export interface Change {}

export interface CevitxeStoreOptions<T> {
  // Redux store
  reducer: ProxyReducer<T>
  preloadedState?: any
  middlewares?: Middleware[]
  // hypercore feed options
  key: string
  secretKey: string
  databaseName?: string
  peerHubs?: string[]
}
