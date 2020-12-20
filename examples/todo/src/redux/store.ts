import { StoreManager } from '@localfirst/state'
import { VisibilityFilter, State } from '../types'
import { logger } from './logger'
import { proxyReducer } from './reducers'

const initialState = {
  visibilityFilter: VisibilityFilter.ALL,
  todoList: [],
  todoMap: {},
}

const middlewares = [logger]

export const storeManager = new StoreManager<State>({
  databaseName: 'todo',
  proxyReducer,
  initialState,
  middlewares,
})
