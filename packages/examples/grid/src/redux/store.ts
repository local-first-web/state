import { Cevitxe } from 'cevitxe'
import { JSONSchema7 } from 'json-schema'
import { createLogger } from 'redux-logger'
import { emptyGrid } from '../emptyGrid'
import { proxyReducer } from './reducers'

export interface State {
  list: string[]
  map: { [key: string]: any }
  schema: JSONSchema7
  _testId: string
}

const initialState: State = emptyGrid(3, 3)

const logger = createLogger()

//const composeEnhancers =
//  (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const urls = process.env.REACT_APP_SIGNAL_SERVERS
  ? process.env.REACT_APP_SIGNAL_SERVERS.split(',')
  : undefined

export const cevitxe = new Cevitxe({
  databaseName: 'grid',
  proxyReducer,
  initialState,
  urls,
  middlewares: [logger],
})
