import React, { createContext, ReactNode, useReducer, Reducer } from 'react'
import { State, VisibilityFilter, Action } from 'src/types'
import { initialize } from './automerge/initialize'
import { load } from './automerge/load'
import { save } from './automerge/save'
import { reducer } from './reducer'
import { ContextInterface } from './types'

export const key = 'todos'

const DEFAULT_STATE: State = initialize({
  visibilityFilter: VisibilityFilter.ALL,
  todoList: [],
  todoMap: {},
})

const initialState = load<State>(key) || DEFAULT_STATE
save(key, initialState)

export const StoreContext = createContext<ContextInterface>({
  state: initialState,
  dispatch: () => {},
})

type R = Reducer<State, Action>

const persistReducer = (reducer: R): R => (state, action) => {
  const nextState = reducer(state, action)
  save(key, nextState)
  return nextState
}

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(persistReducer(reducer), initialState)

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  )
}
