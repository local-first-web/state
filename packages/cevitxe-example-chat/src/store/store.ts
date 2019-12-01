import { StoreManager } from 'cevitxe'
import { proxyReducer } from './reducer'

export const storeManager = new StoreManager({
  databaseName: 'chat',
  proxyReducer,
  initialState: { messages: [] },
})
