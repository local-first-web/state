import A, { Doc } from 'automerge'
import { DELETE_COLLECTION } from './constants'
import { DocSet } from './lib/automerge'
import { ChangeMap } from './types'

export interface CollectionOptions {
  idField?: string
}

export interface State<T> {
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
  /**
   * ## Internals
   *
   *
   *
   */
  const DELETED = '::DELETED'

  const keyName = collection.getKeyName(name)

  // these are for converting individual item IDs back and forth
  const idToKey = (id: string) => `${keyName}::${id}`
  const keyToId = (key: string) => key.replace(`${keyName}::`, '')

  // SELECTORS

  /**
   * Returns all keys for the collection when given the current redux state.
   *
   * @param state The plain JSON representation of the state.
   */
  const getKeys = (state: State<T>): string[] =>
    Object.keys(state || {})
      .filter((key: string) => key.startsWith(`${keyName}::`))
      .filter((key: string) => !(state as any)[key][DELETED])

  /**
   * Given the redux state, returns an array containing all items in the collection.
   *
   * @param state The plain JSON representation of the state.
   */
  const toArray = (state: State<T> = {}) => getKeys(state).map((key: string) => state[key])

  /**
   * Given the redux state, returns a map keying each item in the collection to its `id`.
   *
   * @param state The plain JSON representation of the state.
   */
  const toMap = (state: State<T> = {}) =>
    getKeys(state).reduce((result, key) => ({ ...result, [keyToId(key)]: state[key] }), {})

  /**
   * Returns the number of items in the collection when given the redux state.
   *
   * @param state The plain JSON representation of the state.
   */
  const count = (state: State<T> = {}) => getKeys(state).length

  // REDUCERS

  /**
   * Marks all records in a collection for removal
   */
  const drop = () => {
    return { [keyName]: DELETE_COLLECTION }
  }

  const add = (item: Doc<T> | Doc<T>[]) => {
    const items: Doc<T>[] = Array.isArray(item) ? item : [item]
    const changeFunctions = {} as ChangeMap
    for (const item of items) {
      if (!item.hasOwnProperty(idField))
        throw new Error(`Item doesn't have a property called '${idField}'.`)
      const key = idToKey((item as any)[idField])
      changeFunctions[key] = (s: Doc<T>) => Object.assign(s, item)
    }
    return changeFunctions
  }

  const update = (item: Doc<any>) => ({
    [idToKey(item[idField])]: (s: any) => Object.assign(s, item),
  })

  const remove = ({ id }: { id: string }) => ({
    [idToKey(id)]: (s: any) => (s[DELETED] = true),
  })

  const reducers: { [k: string]: (args?: any) => ChangeMap } = {
    drop,
    add,
    update,
    remove,
  }

  return {
    keyName,
    reducers,
    getKeys,
    toArray,
    toMap,
    count,
  }
}

export namespace collection {
  /**
   * Given the collection's name, returns the `keyName` used internally for tracking the collection.
   *
   * @param {string} collectionName The collection name, e.g. `teachers`
   * @return The key name used internally for the collection (e.g. `::teachers`)
   */
  export const getKeyName = (collectionName: string): string => `::${collectionName}`

  /**
   * Given a collection's `keyName`, returns the collection's name.
   *
   * @param {string} keyName The key name used internally for the collection (e.g. `::teachers`)
   * @return The collection name, e.g. `teachers`
   */
  export const getCollectionName = (keyName: string): string => keyName.replace(/^::/, '')
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
