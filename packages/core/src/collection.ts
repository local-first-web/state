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

  // helpers
  const nonDeletedKeys = (reduxState: any): string[] => {
    if (!reduxState || !reduxState[collectionKey]) return []
    return Object.keys(reduxState[collectionKey]).filter((d: any) => reduxState[collectionKey][d])
  }

  return {
    keyName: collectionKey,

    reducers: {
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
        [collectionKey]: (s: any) => (s[id] = false),
        [id]: DELETE_ITEM,
      }),
    },

    // Gets all items for the collection when given the redux state (an object representation of the DocSet)
    getAll: (reduxState: any) => {
      return nonDeletedKeys(reduxState).map((d: string) => reduxState[d]) // get non-deleted items by key
    },

    count: (reduxState: any) => {
      if (reduxState === undefined || reduxState[collectionKey] === undefined) return 0
      return nonDeletedKeys(reduxState).length
    },
  }
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
