import { cevitxeMiddleware, Feed } from 'cevitxe'
import { applyMiddleware, createStore } from 'redux'
import { key, secretKey } from '../secrets'
import { logger } from './logger'
import { reducer } from './reducers'

export const store = createStore(
  reducer,
  applyMiddleware(logger, cevitxeMiddleware)
)

// create a feed around our redux store
new Feed(store, { key, secretKey })
