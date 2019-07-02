import { createLogger } from 'redux-logger'
import { proxyReducer } from './reducers'
import { Cevitxe } from '@cevitxe/core'
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
const defaultState: State = {
  list: [firstElementId],
  map: { [firstElementId]: { id: firstElementId } },
  schema: { properties: { [firstFieldId]: { description: NEW_FIELD } } },
}

const logger = createLogger()

//const composeEnhancers =
//  (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const cevitxe = new Cevitxe({
  proxyReducer,
  defaultState,
  middlewares: [logger],
})

export const createStore = async (discoveryKey: string) => {
  cevitxe.discoveryKey = discoveryKey
  return await cevitxe.createStore()
}

export const joinStore = async (discoveryKey: string) => {
  cevitxe.discoveryKey = discoveryKey
  return await cevitxe.joinStore()
}
