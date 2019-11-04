import { StoreManager } from 'cevitxe'
import { emptyGrid } from '../ag-grid/emptyGrid'
import { proxyReducer } from './reducers'

const initialState = emptyGrid(3, 3)

const urls = process.env.REACT_APP_SIGNAL_SERVERS
  ? process.env.REACT_APP_SIGNAL_SERVERS.split(',')
  : undefined

export const storeManager = new StoreManager({
  databaseName: 'grid',
  proxyReducer,
  initialState,
  urls,
})
