import { createStore } from 'cevitxe'
import { VisibilityFilter } from 'src/types'
import { logger } from './logger'
import { proxyReducer } from './reducers'
import { Store } from 'redux'

const defaultState = {
  visibilityFilter: VisibilityFilter.ALL,
  todoList: [],
  todoMap: {},
}

const discoveryKey = 'foo'

// Basic middlewares for now, no enhancers.
// TODO: Figure out how to combine enhancers
const middlewares = [logger]

export const buildStore = (discoveryKey: string = ''): Promise<Store> =>
  createStore({
    discoveryKey,
    proxyReducer,
    defaultState,
    middlewares,
  })
