import * as actions from './actions'
import { ProxyReducer, ProxyMultiReducer, ChangeMap } from 'cevitxe'
import { State } from './store'
import { JSONSchema7 } from 'json-schema'
import { inferSchema } from 'src/inferSchema'

export const proxyReducer: ProxyMultiReducer = ({ type, payload, state }) => {
  switch (type) {
    case actions.ITEM_ADD:
      return {
        index: s => (s[payload.id] = true),
        [payload.id]: s => payload,
      }
    case actions.ITEM_REMOVE:
      return {
        index: s => delete s[payload.id],
        [payload.id]: () => undefined,
      }
    case actions.ITEM_UPDATE:
      return {
        [payload.id]: s => (s[payload.field] = payload.value),
      }
    case actions.SCHEMA_LOAD:
      return {
        schema: () => payload.schema,
      }
    case actions.SCHEMA_INFER:
      return {
        schema: () => inferSchema(payload.sampleData),
      }
    case actions.FIELD_ADD:
      return {
        schema: s => {
          s.properties = s.properties || {}
          s.properties[payload.id] = { description: 'New Field' }
        },
      }
    case actions.FIELD_RENAME:
      return {
        schema: s => {
          const fieldSchema = s.properties![payload.id] as JSONSchema7
          fieldSchema.description = payload.description
        },
      }
    case actions.FIELD_DELETE: {
      const changes: ChangeMap = {
        schema: s => delete s.properties![payload.id],
      }
      for (const id in state.index) changes[id] = d => delete d[payload.id]
      return changes
    }
    case actions.FIELD_SET_TYPE: {
      const changes: ChangeMap = {
        schema: s => {
          const fieldSchema = s.properties![payload.id] as JSONSchema7
          fieldSchema.type = payload.type
          //TODO: change all items
          // Object.values(s.map).forEach(d => {
          //   const currentValue = d[payload.id]
          //   if (currentValue != null) {
          //     switch (payload.type) {
          //       case 'number':
          //         const number = Number(currentValue)
          //         if (Number.isNaN(number)) delete d[payload.id]
          //         else d[payload.id] = number
          //         break
          //       case 'string':
          //         d[payload.id] = String(currentValue)
          //         break
          //     }
          //   }
          // })
        },
      }
      return changes
    }
    default:
      return null
  }
}

export const oldProxyReducer: ProxyReducer<State> = ({ type, payload }) => {
  switch (type) {
    case actions.COLLECTION_LOAD:
      return s => {
        s.list = Object.keys(payload.collection)
        s.map = payload.collection
      }

    case actions.COLLECTION_CLEAR:
      return s => {
        s.list = []
        s.map = {}
      }

    case actions.ITEM_ADD:
      return s => {
        s.list.push(payload.id)
        s.map[payload.id] = payload
      }

    case actions.ITEM_REMOVE:
      return s => {
        //s.list = s.list.filter(d => d !== payload.id)
        delete s.map[payload.id]
      }

    case actions.ITEM_UPDATE:
      return s => {
        const item = s.map[payload.id]
        s.map[payload.id] = {
          ...item,
          [payload.field]: payload.value,
        }
      }

    case actions.SCHEMA_LOAD:
      return s => {
        s.schema = payload.schema
      }

    case actions.SCHEMA_INFER:
      return s => {
        s.schema = inferSchema(payload.sampleData)
      }

    case actions.FIELD_ADD:
      return s => {
        s.schema.properties = s.schema.properties || {}
        s.schema.properties[payload.id] = { description: 'New Field' }
      }

    case actions.FIELD_RENAME:
      return s => {
        const schema = s.schema.properties![payload.id] as JSONSchema7
        schema.description = payload.description
      }

    case actions.FIELD_DELETE:
      return s => {
        delete s.schema.properties![payload.id]
        //Object.values(s.map).forEach(d => delete d[payload.id])
      }

    case actions.FIELD_SET_TYPE:
      return s => {
        const schema = s.schema.properties![payload.id] as JSONSchema7
        schema.type = payload.type
        // Object.values(s.map).forEach(d => {
        //   const currentValue = d[payload.id]
        //   if (currentValue != null) {
        //     switch (payload.type) {
        //       case 'number':
        //         const number = Number(currentValue)
        //         if (Number.isNaN(number)) delete d[payload.id]
        //         else d[payload.id] = number
        //         break
        //       case 'string':
        //         d[payload.id] = String(currentValue)
        //         break
        //     }
        //   }
        // })
      }
    default:
      return null
  }
}
