import { StoreManager } from 'cevitxe'
import { VisibilityFilter } from '../types'
import { logger } from './logger'
import { proxyReducer } from './reducers'

const initialState = {
  root: {
    visibilityFilter: VisibilityFilter.ALL,
    todoList: [],
    todoMap: {},
  },
}

const middlewares = [logger]

const urls = process.env.REACT_APP_SIGNAL_SERVERS
  ? process.env.REACT_APP_SIGNAL_SERVERS.split(',')
  : undefined

export const storeManager = new StoreManager({
  databaseName: 'todo',
  proxyReducer,
  initialState,
  urls,
  middlewares,
})
