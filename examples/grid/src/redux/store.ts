import { StoreManager } from '@localfirst/state'
import { emptyGrid } from '../ag-grid/emptyGrid'
import { proxyReducer } from './reducers'
import { GridState } from 'types'

const initialState = emptyGrid(3, 3) as GridState

const urls = process.env.REACT_APP_RELAYS ? process.env.REACT_APP_RELAYS.split(',') : undefined

export const storeManager = new StoreManager<GridState>({
  databaseName: 'grid',
  proxyReducer,
  collections: ['rows'],
  initialState,
  urls,
})
