import { ChangeFn, ProxyReducer } from '@localfirst/types'
import { inferSchema } from 'inferSchema'
import { JSONSchema7 } from 'json-schema'
import { GridState } from '@localfirst/types'
import * as actions from './actions'

const toArray = <T>(x: T | T[] | null) => (x === null ? [] : Array.isArray(x) ? x : [x])

export const proxyReducer: ProxyReducer<GridState> = (state, { type, payload }) => {
  const collection = 'rows'
  switch (type) {
    case actions.ITEM_ADD: {
      const newRows = toArray(payload)
      return newRows.map(newRow => {
        const { id } = newRow
        const fn = (row: any) => Object.assign(row, newRow)
        return { collection, id, fn }
      })
    }

    case actions.ITEM_UPDATE: {
      const updatedRow = payload
      const { id } = updatedRow
      const fn = (row: any) => {
        Object.assign(row, updatedRow)
      }
      return { collection, id, fn }
    }

    case actions.ITEM_REMOVE:
      return {
        collection,
        id: payload.id,
        delete: true,
      }

    case actions.COLLECTION_CLEAR:
      return {
        collection,
        drop: true,
      }

    case actions.COLLECTION_LOAD: {
      const newRows = toArray(payload.collection)
      return newRows.map(newRow => {
        const { id } = newRow
        const fn = (row: any) => Object.assign(row, newRow)
        return { collection, id, fn }
      })
    }

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
        const fieldId = payload.id
        s.schema.properties = s.schema.properties || {}
        s.schema.properties[fieldId] = { description: 'New Field' }
      }

    case actions.FIELD_RENAME:
      return s => {
        const fieldSchema = s.schema.properties![payload.id] as JSONSchema7
        fieldSchema.description = payload.description
      }

    case actions.FIELD_DELETE: {
      const { id: fieldId } = payload

      // remove field from schema
      const schemaChange = (s: GridState) => {
        delete s.schema.properties![fieldId]
      }

      // change function: delete the value from one row
      const fn = (row: any) => {
        delete row[fieldId]
      }

      const rowIds = Object.keys(state.rows)
      const rowChanges = rowIds.map((id: string) => ({ collection, id, fn }))

      return [schemaChange, ...rowChanges]
    }

    case actions.FIELD_SET_TYPE: {
      const { id: fieldId, type: newType } = payload

      // update schema
      const schemaChange: ChangeFn<GridState> = s => {
        const fieldSchema = s.schema.properties![fieldId] as JSONSchema7
        fieldSchema.type = newType
      }

      // change function: update the column value in one row
      const fn = (row: any) => {
        if (row[fieldId] !== null) {
          switch (newType) {
            case 'number':
              const number = Number(row[fieldId])
              if (Number.isNaN(number)) row[fieldId] = ''
              else row[fieldId] = number
              break
            case 'string':
              row[fieldId] = String(row[fieldId])
              break
          }
        }
      }

      const rowIds = Object.keys(state.rows)
      const rowChanges = rowIds.map((id: string) => ({ collection, id, fn }))

      return [schemaChange, ...rowChanges]
    }

    default:
      return null
  }
}
