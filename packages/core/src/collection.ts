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
    drop: () => {
      return { [collectionKey]: DELETE_COLLECTION }
    },

    add: (item: any) => ({
      [collectionKey]: (s: any) => Object.assign(s, { [item[idField]]: true }),
      [item[idField]]: (s: any) => Object.assign(s, item),
    }),

    update: (item: any) => ({
      [item[idField]]: (s: any) => Object.assign(s, item),
    }),

    remove: (item: any) => ({
      [collectionKey]: (s: any) => delete s[item[idField]],
      [item[idField]]: DELETE_ITEM,
    }),
  }
}

export const deleteCollectionItems = (docSet: DocSet<any>, key: string) => {
  const collectionIndexDoc = docSet.getDoc(key)

  for (const docId in collectionIndexDoc) {
    docSet.removeDoc(docId)
    delete collectionIndexDoc[docId]
  }

  docSet.setDoc(key, collectionIndexDoc)
}
