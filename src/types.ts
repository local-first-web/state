import Automerge from 'automerge'

export interface Action {
  type: string
  payload: any
}

export type ProxyReducer<T> = (action: Action) => Automerge.ChangeFn<T> | null
