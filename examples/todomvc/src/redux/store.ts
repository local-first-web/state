import { applyMiddleware, createStore } from 'redux'
import { persistReducer, persistStore } from 'redux-persist'
import storage from 'redux-persist/lib/storage' // LocalStorage by default
import { logger } from './logger'
import { reducers } from './reducers'

const persistConfig = { key: 'root', storage }
const reducer = persistReducer(persistConfig, reducers)

const enhancer = applyMiddleware(logger)
//const enhancer = applyMiddleware(logger, cevitxe)

export const store = createStore(reducer, enhancer)

export const persistor = persistStore(store)
