import { Cevitxe, collection } from 'cevitxe'
import { emptyGrid } from '../ag-grid/emptyGrid'
import { proxyReducer } from './reducers'

export const rowCollectionName = 'rows'
export const rowCollectionKey = collection(rowCollectionName).keyName

const initialState = emptyGrid(3, 3)

const urls = process.env.REACT_APP_SIGNAL_SERVERS
  ? process.env.REACT_APP_SIGNAL_SERVERS.split(',')
  : undefined

export const cevitxe = new Cevitxe({
  databaseName: 'grid',
  proxyReducer,
  initialState,
  urls,
})
