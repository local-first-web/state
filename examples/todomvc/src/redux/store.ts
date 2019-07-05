import { Cevitxe } from '@cevitxe/core'
import { VisibilityFilter } from '../types'
import { logger } from './logger'
import { proxyReducer } from './reducers'

const defaultState = {
  visibilityFilter: VisibilityFilter.ALL,
  todoList: [],
  todoMap: {},
}

// Basic middlewares for now, no enhancers.
// TODO: Figure out how to combine enhancers
const middlewares = [logger]

export const cevitxe = new Cevitxe({
  proxyReducer,
  defaultState,
  middlewares,
})
