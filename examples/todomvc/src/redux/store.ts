import * as cevitxe from '@cevitxe/core'
import { VisibilityFilter } from '../types'
import { logger } from './logger'
import { proxyReducer } from './reducers'
import { Store } from 'redux'

const defaultState = {
  visibilityFilter: VisibilityFilter.ALL,
  todoList: [],
  todoMap: {},
}

// Basic middlewares for now, no enhancers.
// TODO: Figure out how to combine enhancers
const middlewares = [logger]

export const createStore = (discoveryKey: string): Promise<Store> =>
  cevitxe.createStore({
    discoveryKey,
    proxyReducer,
    defaultState,
    middlewares,
  })

export const joinStore = (discoveryKey: string): Promise<Store> =>
  cevitxe.joinStore({
    discoveryKey,
    proxyReducer,
    middlewares,
  })
