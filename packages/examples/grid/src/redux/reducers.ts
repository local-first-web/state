import { ChangeMap, collection, ProxyReducer } from 'cevitxe'
import { inferSchema } from 'inferSchema'
import { JSONSchema7 } from 'json-schema'
import * as actions from './actions'
import { rowCollectionName as rows } from './store'

export const proxyReducer: ProxyReducer = ({ type, payload, state }) => {
  const { add, update, remove, drop, addMany } = collection(rows).reducers
  switch (type) {
    case actions.ITEM_ADD:
      return add(payload)

    case actions.ITEM_UPDATE:
      return update(payload)

    case actions.ITEM_REMOVE:
      return remove(payload)

    case actions.COLLECTION_CLEAR:
      return drop()

    case actions.COLLECTION_LOAD:
      return addMany(payload.collection)

    case actions.SCHEMA_LOAD:
      return { schema: s => Object.assign(s, payload.schema) }

    case actions.SCHEMA_INFER:
      return { schema: s => Object.assign(s, inferSchema(payload.sampleData)) }

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
