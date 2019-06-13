import { cevitxeMiddleware, Feed } from 'cevitxe'
import { applyMiddleware, createStore } from 'redux'
import { key, secretKey } from '../secrets'
import { reducer } from './reducers'

export const store = createStore(
  reducer,
  undefined,
  applyMiddleware(cevitxeMiddleware)
)

// create a feed around our redux store
new Feed(store, { key, secretKey })
