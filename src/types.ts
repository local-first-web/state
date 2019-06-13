export interface Action {
  type: string
  payload: any
}

type ChangeFn<T> = (doc: T) => void

export type ProxyReducer<T> = (action: Action) => ChangeFn<T> | null
