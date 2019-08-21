import A from 'automerge'
import { DocSet } from './lib/automerge'
import { DELETE_COLLECTION, DELETE_ITEM } from './constants'

interface CollectionOptions {
  idField?: string
}

/**
 * The collection function returns helpers for CRUD operations, hiding some of the messiness of
 * multi-document state from the developer.
 *
 * Each method (`add`, `remove`, etc.) returns a dictionary of ProxyReducer functions for modifying
 * the collection index and/or the individual item.
 *
 * @param name The name of the collection.
 * @param idField The property of an object containing a unique identifier, normally a uuid.
 * Optional; defaults to 'id'.
 */
export function collection(name: string, { idField = 'id' }: CollectionOptions = {}) {
  const collectionKey = `::${name}`

  return {
    keyName: collectionKey,

    drop: () => {
      return { [collectionKey]: DELETE_COLLECTION }
    },

    add: (item: any) => ({
      [collectionKey]: (s: any) => Object.assign(s, { [item[idField]]: true }),
      [item[idField]]: (s: any) => Object.assign(s, item),
    }),

    addManyFromMap: (map: any) => {
      const newKeys = {} as any
      const newRowIndex = {} as any
      for (const key in map) {
        newKeys[key] = (s: any) => Object.assign(s, map[key])
        newRowIndex[key] = true
      }
      return {
        ...newKeys,
        [collectionKey]: (s: any) => Object.assign(s, newRowIndex),
      }
    },

    update: (item: any) => ({
      [item[idField]]: (s: any) => Object.assign(s, item),
    }),

    remove: ({ id }: { id: string }) => ({
      [collectionKey]: (s: any) => delete s[id],
      [id]: DELETE_ITEM,
    }),

    // Gets all items for the collection when given the redux state (an object representation of the DocSet)
    getAll: (reduxState: any) => {
      return Object.keys(reduxState[collectionKey]).map((d: string) => reduxState[d])
    },

    count: (reduxState: any) => {
      if (reduxState === undefined || reduxState[collectionKey] === undefined) return 0
      return Object.keys(reduxState[collectionKey]).length
    },
  }
}

export const deleteCollectionItems = (docSet: DocSet<any>, key: string) => {
  let collectionIndexDoc = docSet.getDoc(key)

  for (const docId in collectionIndexDoc) {
    docSet.removeDoc(docId)
    collectionIndexDoc = A.change(collectionIndexDoc, (doc: any) => delete doc[docId])
  }

  docSet.setDoc(key, collectionIndexDoc)
}
