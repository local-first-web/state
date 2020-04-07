import { StoreManager } from 'cevitxe'
import { emptyGrid } from '../ag-grid/emptyGrid'
import { proxyReducer } from './reducers'
import { GridState } from 'types'

const initialState = emptyGrid(3, 3) as GridState

const urls = process.env.REACT_APP_SIGNAL_SERVERS
  ? process.env.REACT_APP_SIGNAL_SERVERS.split(',')
  : undefined

export const storeManager = new StoreManager<GridState>({
  databaseName: 'grid',
  proxyReducer,
  collections: ['rows'],
  initialState,
  urls,
})
