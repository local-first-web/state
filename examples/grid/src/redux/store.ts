import { createLogger } from 'redux-logger'
import { proxyReducer } from './reducers'
import { Cevitxe } from 'cevitxe'
import uuid from 'uuid'
import { JSONSchema7 } from 'json-schema'

const NEW_FIELD = 'New Field'

export interface State {
  list: string[]
  map: { [key: string]: any }
  schema: JSONSchema7
}

const firstElementId = uuid()
const firstFieldId = uuid()
const initialState: State = {
  list: [firstElementId],
  map: { [firstElementId]: { id: firstElementId } },
  schema: { properties: { [firstFieldId]: { description: NEW_FIELD } } },
}

const logger = createLogger()

//const composeEnhancers =
//  (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export const cevitxe = new Cevitxe({
  proxyReducer,
  initialState,
  middlewares: [logger],
})
