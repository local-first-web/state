import A from 'automerge'
import { DocSet } from './lib/automerge'
import { DELETE_COLLECTION, DELETE_ITEM } from './constants'

interface CollectionOptions {
  idField?: string
}

interface State {
  [key: string]: any
}

const DELETED = '::DELETED'

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
export function collection(name: string, { idField = 'id' }: CollectionOptions = {}) {
  const collectionKey = `::${name}`

  const itemKey = (id: string) => `${collectionKey}::${id}`

  const nonDeletedKeys = (state: State): string[] => {
    return Object.keys(state || {})
      .filter((key: string) => key.startsWith(`${collectionKey}::`))
      .filter((key: any) => !state[key][DELETED])
  }

  return {
    keyName: collectionKey,

    reducers: {
      drop: () => {},

      add: (item: any) => {
        const key = itemKey(item[idField])
        return {
          // add item to root
          [key]: (s: any) => Object.assign(s, item),
        }
      },

      addMany: (items: any[]) => {
        const newKeys = {} as any
        const newRowIndex = {} as any
        for (const item of items) {
          if (!item.hasOwnProperty(idField))
            throw new Error(
              `Item doesn't have a property called '${idField}' (${JSON.stringify(item)}).`
            )
          const key = itemKey(item[idField])
          newKeys[key] = (s: any) => Object.assign(s, item)
          newRowIndex[key] = true
        }
        return {
          ...newKeys,
        }
      },

      update: (item: any) => ({
        [itemKey(item[idField])]: (s: any) => Object.assign(s, item),
      }),

      remove: ({ id }: { id: string }) => {
        const key = itemKey(id)
        return {
          // set deleted flag on item
          [key]: (s: any) => (s[DELETED] = true),
        }
      },
    },

    // Gets all items for the collection when given the redux state (an object representation of the DocSet)
    getAll: (state: any) => nonDeletedKeys(state).map((d: string) => state[d]),

    count: (state: any) => nonDeletedKeys(state).length,
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
