import { createStore, CevitxeStore } from 'cevitxe'
import { logger } from './logger'
import { proxyReducer } from './reducers'
import { VisibilityFilter } from 'src/types'

const defaultState = {
  visibilityFilter: VisibilityFilter.ALL,
  todoList: [],
  todoMap: {},
}

// Basic middlewares for now, no enhancers.
// TODO: Figure out how to combine enhancers
const middlewares = [logger]

export const buildStore = (
  key: string = '',
  secretKey: string = ''
): Promise<CevitxeStore> =>
  createStore({
    key,
    secretKey,
    proxyReducer,
    defaultState,
    middlewares,
  })
