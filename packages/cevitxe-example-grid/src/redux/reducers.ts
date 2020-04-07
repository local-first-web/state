import { collection } from 'cevitxe'
import { ChangeFn, ChangeMap, ProxyReducer } from 'cevitxe-types'
import { inferSchema } from 'inferSchema'
import { JSONSchema7 } from 'json-schema'
import * as actions from './actions'
import { GridState } from 'types'

const rows = collection('rows')
export const proxyReducer: ProxyReducer<GridState> = (state, { type, payload }) => {
  const { add, update, change, remove, drop } = rows.reducers
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
      return add(payload.collection)

    case actions.SCHEMA_LOAD:
      return s => (s.schema = payload.schema)

    case actions.SCHEMA_INFER:
      return s => (s.schema = inferSchema(payload.sampleData))

    case actions.FIELD_ADD:
      return s => {
        s.schema.properties = s.schema.properties || {}
        s.schema.properties[payload.id] = { description: 'New Field' }
      }

    case actions.FIELD_RENAME:
      return s => {
        const fieldSchema = s.schema.properties![payload.id] as JSONSchema7
        fieldSchema.description = payload.description
      }

    case actions.FIELD_DELETE: {
      const { id: fieldId } = payload

      // remove field from schema
      const schemaChanges: ChangeFn<GridState> = s => {
        delete s.schema.properties![fieldId]
      }

      // delete each value from each row
      const documentIds = Object.keys(state.rows)
      const deleteField = (documentId: string) => change(documentId, d => delete d[fieldId])

      return [schemaChanges, ...documentIds.map(deleteField)]
    }

    case actions.FIELD_SET_TYPE: {
      const { id: fieldId, type: newType } = payload

      // update schema
      const schemaChanges: ChangeFn<GridState> = s => {
        const fieldSchema = s.schema.properties![fieldId] as JSONSchema7
        fieldSchema.type = newType
      }

      // update the column value in each row
      const documentIds = Object.keys(state.rows)
      const updateFieldType = (documentId: string) =>
        change(documentId, d => {
          if (d[fieldId] !== null) {
            switch (newType) {
              case 'number':
                const number = Number(d[fieldId])
                if (Number.isNaN(number)) d[fieldId] = ''
                else d[fieldId] = number
                break
              case 'string':
                d[fieldId] = String(d[fieldId])
                break
            }
          }
        })

      return [schemaChanges, ...documentIds.map(updateFieldType)]
    }

    default:
      return null
  }
}
