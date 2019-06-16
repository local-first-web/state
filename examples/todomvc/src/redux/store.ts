import { createStore } from 'cevitxe'
import { logger } from './logger'
import { proxyReducer } from './reducers'
import { VisibilityFilter } from 'src/types'
import { key, secretKey } from '../secrets'

const defaultState = {
  visibilityFilter: VisibilityFilter.ALL,
  todoList: [],
  todoMap: {},
}

// Basic middlewares for now, no enhancers.
// TODO: Figure out how to combine enhancers
const middlewares = [logger]

export const store = createStore({
  key,
  secretKey,
  proxyReducer,
  defaultState,
  middlewares,
})
