import { cevitxeMiddleware, Feed, initialize } from 'cevitxe'
import { applyMiddleware, createStore } from 'redux'
import { key, secretKey } from '../secrets'
import { logger } from './logger'
import { reducer } from './reducers'
import { VisibilityFilter } from 'src/types'


const initialState = initialize({
  visibilityFilter: VisibilityFilter.ALL,
  todoList: [],
  todoMap: {},
})

export const store = createStore(
  reducer,
  initialState,
  applyMiddleware(logger, cevitxeMiddleware)
)

// create a feed around our redux store
new Feed(store, { key, secretKey })
