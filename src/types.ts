import { Reducer, Middleware } from 'redux'

export interface Action {
  type: string
  payload: any
}

export type ProxyReducer<T> = (action: Action) => ChangeFn<T> | null

export type ReducerAdapter = <T>(
  proxy: ProxyReducer<T>
) => Reducer<T | undefined, Action>

// stand-ins for Automerge types
type ChangeFn<T> = (doc: T) => void
export interface Change {}

export interface CevitxeStoreOptions {
  // Redux store
  reducer: Reducer
  preloadedState?: any
  middlewares?: Middleware[]
  // hypercore feed options
  key: string
  secretKey: string
  databaseName?: string
  peerHubs?: string[]
}
