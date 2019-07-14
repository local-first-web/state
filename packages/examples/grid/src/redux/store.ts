import { Cevitxe } from 'cevitxe'
import { JSONSchema7 } from 'json-schema'
import { createLogger } from 'redux-logger'
import { emptyGrid } from '../emptyGrid'
import { proxyReducer } from './reducers'

export interface State {
  list: string[]
  map: { [key: string]: any }
  schema: JSONSchema7
}

const initialState: State = emptyGrid(3, 3)

const logger = createLogger()

//const composeEnhancers =
//  (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export const cevitxe = new Cevitxe({
  databaseName: 'grid',
  proxyReducer,
  initialState,
  middlewares: [logger],
})
