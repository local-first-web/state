import uuid from 'uuid'
import { JSONSchema7 } from 'json-schema'

export const SCHEMA_LOAD = 'SCHEMA_LOAD'
export const SCHEMA_INFER = 'SCHEMA_INFER'
export const FIELD_ADD = 'FIELD_ADD'
export const FIELD_RENAME = 'FIELD_RENAME'
export const FIELD_DELETE = 'FIELD_DELETE'
export const FIELD_SET_TYPE = 'FIELD_SET_TYPE'
export const COLLECTION_LOAD = 'COLLECTION_LOAD'
export const COLLECTION_CLEAR = 'COLLECTION_CLEAR'
export const ITEM_ADD = 'ITEM_ADD'
export const ITEM_UPDATE = 'ITEM_UPDATE'
export const ITEM_REMOVE = 'ITEM_REMOVE'

export function loadSchema(schema: JSONSchema7) {
  return { type: SCHEMA_LOAD, payload: { schema } }
}

export function inferSchema(sampleData: any) {
  return { type: SCHEMA_INFER, payload: { sampleData } }
}

export function addField() {
  return { type: FIELD_ADD, payload: { id: uuid() } }
}

export function renameField(id: string, description: string) {
  return { type: FIELD_RENAME, payload: { id, description } }
}

export function deleteField(id: string) {
  return { type: FIELD_DELETE, payload: { id } }
}

export function setFieldType(id: string, type: string) {
  return { type: FIELD_SET_TYPE, payload: { id, type } }
}

export function loadCollection(collection: any[]) {
  return { type: COLLECTION_LOAD, payload: { collection } }
}

export function clearCollection() {
  return { type: COLLECTION_CLEAR, payload: {} }
}

export function addItem(item: any = { id: uuid() }) {
  return { type: ITEM_ADD, payload: item }
}

export function updateItem(item: any) {
  return { type: ITEM_UPDATE, payload: item }
}

export function removeItem(item: any) {
  return { type: ITEM_REMOVE, payload: item }
}
