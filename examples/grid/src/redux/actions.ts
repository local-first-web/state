import { v4 as uuid } from 'uuid'
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

export const loadSchema = (schema: JSONSchema7) => ({
  type: SCHEMA_LOAD,
  payload: { schema },
})

export const inferSchema = (sampleData: any) => ({
  type: SCHEMA_INFER,
  payload: { sampleData },
})

export const addField = () => ({
  type: FIELD_ADD,
  payload: { id: uuid() },
})

export const renameField = (id: string, description: string) => ({
  type: FIELD_RENAME,
  payload: { id, description },
})

export const deleteField = (id: string) => ({
  type: FIELD_DELETE,
  payload: { id },
})

export const setFieldType = (id: string, type: string) => ({
  type: FIELD_SET_TYPE,
  payload: { id, type },
})

export const loadCollection = (collection: any[]) => ({
  type: COLLECTION_LOAD,
  payload: { collection },
})

export const clearCollection = () => ({
  type: COLLECTION_CLEAR,
  payload: {},
})

export const addItem = (item: any = { id: uuid(), displayOrder: Date.now() * 1000 }) => ({
  type: ITEM_ADD,
  payload: item,
})

export const updateItem = (item: any) => ({
  type: ITEM_UPDATE,
  payload: item,
})

export const removeItem = (item: any) => ({
  type: ITEM_REMOVE,
  payload: item,
})
