import { ChangeFn, ProxyReducer, ChangeManifest } from 'cevitxe-types'
import { inferSchema } from 'inferSchema'
import { JSONSchema7 } from 'json-schema'
import { GridState } from 'types'
import * as actions from './actions'

const toArray = <T>(x: T | T[] | null) => (x === null ? [] : Array.isArray(x) ? x : [x])

export const proxyReducer: ProxyReducer<GridState> = (state, { type, payload }) => {
  switch (type) {
    case actions.ITEM_ADD: {
      const newRows = toArray(payload)
      return newRows.map(newRow => ({
        collection: 'rows',
        id: newRow.id,
        fn: row => Object.assign(row, newRow),
      }))
    }

    case actions.ITEM_UPDATE: {
      const updatedRow = payload
      return {
        collection: 'rows',
        id: payload.id,
        fn: row => Object.assign(row, updatedRow),
      }
    }

    case actions.ITEM_REMOVE:
      return {
        collection: 'rows',
        id: payload.id,
        delete: true,
      }

    case actions.COLLECTION_CLEAR:
      return {
        collection: 'rows',
        drop: true,
      }

    case actions.COLLECTION_LOAD:
      return toArray(payload.collection).map(newRow => ({
        collection: 'rows',
        id: newRow.id,
        fn: row => Object.assign(row, newRow),
      }))

    case actions.SCHEMA_LOAD:
      return (s: GridState) => {
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
        const fieldSchema = s.schema.properties![payload.id] as JSONSchema7
        fieldSchema.description = payload.description
      }

    case actions.FIELD_DELETE: {
      const { id: fieldId } = payload

      // remove field from schema
      const schemaChanges = (s: GridState) => {
        delete s.schema.properties![fieldId]
      }

      // delete each value from each row
      const ids = Object.keys(state.rows)
      const deleteField = (id: string) => ({
        collection: 'rows',
        id,
        fn: (row: any) => {
          delete row[fieldId]
        },
      })

      return [schemaChanges, ...ids.map(deleteField)]
    }

    case actions.FIELD_SET_TYPE: {
      const { id: fieldId, type: newType } = payload

      // update schema
      const schemaChanges: ChangeFn<GridState> = s => {
        const fieldSchema = s.schema.properties![fieldId] as JSONSchema7
        fieldSchema.type = newType
      }

      // update the column value in each row
      const ids = Object.keys(state.rows)
      const updateFieldType = (id: string) => ({
        collection: 'rows',
        id,
        fn: (row: any) => {
          if (row[fieldId] !== null) {
            switch (newType) {
              case 'number': {
                const number = Number(row[fieldId])
                if (Number.isNaN(number)) row[fieldId] = ''
                else row[fieldId] = number
              }
              case 'string': {
                row[fieldId] = String(row[fieldId])
              }
            }
          }
        },
      })

      return [schemaChanges, ...ids.map(updateFieldType)]
    }

    default:
      return null
  }
}
