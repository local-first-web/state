import { createStore } from 'cevitxe'
import { logger } from './logger'
import { reducer } from './reducers'
import { Reducer, AnyAction } from 'redux'
import { VisibilityFilter } from 'src/types'

const initialState = {
  visibilityFilter: VisibilityFilter.ALL,
  todoList: [],
  todoMap: {},
}

// Basic middlewares for now, no enhancers.
// We'll need to figure out how to combine enhancers later
const middlewares = [logger]

// const startingState = window.location.search === "?bootstrap" ? initialState : null

// Casting the reducer here to match redux's expectation. We'll need to figure out a better way
export const store = createStore({
  reducer: reducer as Reducer<any, AnyAction>,
  preloadedState: initialState,
  middlewares,
})
