import A, { Doc } from 'automerge'
import { DELETE_COLLECTION } from './constants'
import { DocSet } from './lib/automerge'
import { ChangeMap } from './types'

interface CollectionOptions {
  idField?: string
}

interface State<T> {
  [key: string]: Doc<T>
}

/**
 * The collection function returns helpers for CRUD operations, hiding the implementation details of
 * multi-document state from the developer.
 *
 * Each of the reducers (`add`, `remove`, etc.) returns a dictionary of ProxyReducer functions for
 * modifying the collection index and/or the individual item.
 *
 * @param name The name of the collection.
 * @param idField The property of an object containing a unique identifier, normally a uuid.
 * Optional; defaults to 'id'.
 */
export function collection<T = any>(name: string, { idField = 'id' }: CollectionOptions = {}) {
  const DELETED = '::DELETED'

  const keyName = collection.getKeyName(name)
  const itemKey = (id: string) => `${keyName}::${id}`

  const getKeys = (state?: State<T>): string[] => {
    return Object.keys(state || {})
      .filter((key: string) => key.startsWith(`${keyName}::`))
      .filter((key: string) => !(state as any)[key][DELETED])
  }

  // Gets all items for the collection when given the redux state (an object representation of the DocSet)
  const getAll = (state: State<T> = {}) => getKeys(state).map((d: string) => state[d])

  const count = (state: State<T> = {}) => getKeys(state).length

  const reducers: { [k: string]: (args?: any) => ChangeMap } = {
    drop: () => {
      return { [keyName]: DELETE_COLLECTION }
    },

    add: (item: Doc<T> | Doc<T>[]) => {
      const items: Doc<T>[] = Array.isArray(item) ? item : [item]
      const changeFunctions = {} as ChangeMap
      for (const item of items) {
        if (!item.hasOwnProperty(idField))
          throw new Error(`Item doesn't have a property called '${idField}'.`)
        const key = itemKey((item as any)[idField])
        changeFunctions[key] = (s: Doc<T>) => Object.assign(s, item)
      }
      return changeFunctions
    },

    update: (item: Doc<any>) => ({
      [itemKey(item[idField])]: (s: any) => Object.assign(s, item),
    }),

    remove: ({ id }: { id: string }) => ({
      [itemKey(id)]: (s: any) => (s[DELETED] = true),
    }),
  }

  return {
    keyName,
    reducers,
    getKeys,
    getAll,
    count,
  }
}

export namespace collection {
  /**
   * Given a collection's name (e.g. `teachers`) returns its `keyName` (e.g. `::teachers`)
   */
  export const getKeyName = (collectionName: string) => `::${collectionName}`

  /**
   * Given a collection's `keyName` (e.g. `::teachers`) returns the collection's name (e.g. `teachers`)
   */
  export const getCollectionName = (keyName: string) => keyName.replace(/^::/, '')
}

// mark all docs in the given index as deleted, removing referenced docs from the local docSet
export const deleteCollectionItems = (docSet: DocSet<any>, collectionKey: string) => {
  let collectionIndexDoc = docSet.getDoc(collectionKey)
  for (const docId in collectionIndexDoc) {
    // mark doc as deleted in index
    collectionIndexDoc = A.change(collectionIndexDoc, (doc: any) => (doc[docId] = false))
    // remove the referenced doc
    docSet.removeDoc(docId)
  }
  docSet.setDoc(collectionKey, collectionIndexDoc)
}

// remove any docs that are marked as deleted in a collection but still exist in the docSet
export const purgeDeletedCollectionItems = (docSet: DocSet<any>, collectionKey: string) => {
  let collectionIndexDoc = docSet.getDoc(collectionKey)
  const deletedDocIds = Object.keys(collectionIndexDoc).filter(x => !collectionIndexDoc[x])
  for (const docId of deletedDocIds) {
    // remove "deleted" doc if it still exists
    const doc = docSet.getDoc(docId)
    if (doc) docSet.removeDoc(docId)
  }
}
