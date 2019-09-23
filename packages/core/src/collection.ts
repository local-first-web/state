import A, { Doc, DocSet } from 'automerge'
import { DELETE_COLLECTION } from './constants'
import { docSetToObject } from './docSetHelpers'
import { ChangeMap, DocSetState } from './types'

export interface CollectionOptions {
  idField?: string
}

/**
 * @param name The name of the collection.
 * @param idField The property of an object containing a unique identifier, normally a uuid.
 * Optional; defaults to 'id'.
 *
 * The collection function returns helpers for CRUD operations, hiding the implementation details of
 * multi-document state from the developer.
 *
 * Each of the reducers (`add`, `remove`, etc.) returns a dictionary of ProxyReducer functions or
 * flags for modifying the docset and/or one or many docs.
 *
 * Here's how this might be used in a reducer:
 * ```ts
 *  const { add, update, remove, drop } = collection('rows').reducers
 *  switch (type) {
 *    case actions.ITEM_ADD:
 *      return add(payload)
 *    case actions.ITEM_UPDATE:
 *      return update(payload)
 *    case actions.ITEM_REMOVE:
 *      return remove(payload)
 *    case actions.COLLECTION_CLEAR:
 *      return drop()
 * // ...
 * }
 * ```
 *
 * To access the items in a collection, use the selector methods.
 * ```ts
 *  const rowArray = collection('rows').selectors.getAll(state)
 *  const rowMap = collection('rows').selectors.getMap(state)
 * ```
 */
export function collection<T = any>(name: string, { idField = 'id' }: CollectionOptions = {}) {
  /**
   * ## How collections are stored
   *
   * Multiple collections can be stored side-by-side in a single `DocSet`, with each item as an
   * individual root-level Automerge document. So a `DocSet` might look something like this:
   * ```ts
   * {
   *   '::teachers::abcdef1234': {id: 'abcdef1234', first: 'Herb', last: 'Caudill' },
   *   '::teachers::qrs7890xyz': {id: 'qrs7890xyz', first: 'Diego', last: 'Mijelshon' },
   *   '::students::lmnopqrs12': {id: 'lmnopqrs12', first: 'Steve', last: 'Jobs' },
   *   '::students::qwerty1234': {id: 'qwerty1234', first: 'Steve', last: 'Wozniak' },
   * }
   * ```
   * There are no index documents, because it's currently impractical to store very large arrays as
   * Automerge documents. Instead, to know which docs belong to which collection, we create a key
   * that prepends the collection name to the document's unique ID.
   *
   * ### Deleting documents
   *
   * Since we don't have an index, we need to delete documents in two steps:
   *
   *    1. We mark them as deleted by adding a special "deleted" flag. This allows the deletion to be
   *       persisted and propagated to peers.
   *       ```ts
   *       {
   *         '::teachers::abcdef1234': {id: 'abcdef1234', first: 'Herb', last: 'Caudill', [DELETED]: true },
   *         '::teachers::qrs7890xyz': {id: 'qrs7890xyz', first: 'Diego', last: 'Mijelshon' },
   *       }
   *       ```
   *    2. The actual deletion is then performed in middleware.
   *
   * ### Dropping a collection
   *
   * We want to be able to drop a collection in a single action from a reducer, but we don't have an
   * index and we don't have a reference to the `DocSet` from within the reducer to get a list of
   * documents. So instead of returning reducer functions, we return a new object keyed to the
   * collection name and containing just the DELETE_COLLECTION flag.
   * ```ts
   * {
   *   '::teachers::abcdef1234': {id: 'abcdef1234', first: 'Herb', last: 'Caudill', ['::DELETED']: true },
   *   '::teachers::qrs7890xyz': {id: 'qrs7890xyz', first: 'Diego', last: 'Mijelshon' },
   *   '::teachers': DELETE_COLLECTION
   * }
   */

  // TODO: Review the comment above - we actually do have a reference to the `DocSet` in
  // `AdaptReducer`, so why not perform the deletions there instead of middleware? Would be cleaner
  // to make all changes in the reducer, and have the middleware just take care of persistence.

  const DELETED = '::DELETED'

  const keyName = collection.getKeyName(name)

  // these are for converting individual item IDs back and forth
  const idToKey = (id: string) => `${keyName}::${id}`
  const keyToId = (key: string) => key.replace(`${keyName}::`, '')

  const setDeleteFlag = (s: any) => Object.assign(s, { [DELETED]: true })

  // SELECTORS

  /**
   * Returns all keys for the collection when given the current redux state.
   * @param state The plain JSON representation of the state.
   */
  const keys = (state: DocSetState<T>, { includeDeleted = false } = {}): string[] => {
    const collectionItems = Object.keys(state || {}).filter((key: string) =>
      key.startsWith(`${keyName}::`)
    )
    return includeDeleted
      ? collectionItems
      : collectionItems.filter((key: string) => !(state as any)[key][DELETED])
  }

  /**
   * Given the redux state, returns an array containing all items in the collection.
   * @param state The plain JSON representation of the state.
   */
  const getAll = (state: DocSetState<T> = {}) => keys(state).map((key: string) => state[key])

  /**
   * Given the redux state, returns a map keying each item in the collection to its `id`.
   * @param state The plain JSON representation of the state.
   */
  const getMap = (state: DocSetState<T> = {}): DocSetState<T> =>
    keys(state).reduce((result, key) => ({ ...result, [keyToId(key)]: state[key] }), {})

  /**
   * Returns the number of items in the collection when given the redux state.
   * @param state The plain JSON representation of the state.
   */
  const count = (state: DocSetState<T> = {}) => keys(state).length

  const removeAll = (docSet: DocSet<any>) => {
    //TODO: filter docSet.docIds instead of converting the docSet to reuse keys
    const docIds = keys(docSetToObject(docSet))
    for (const docId of docIds) {
      const doc = docSet.getDoc(docId)
      const deletedDoc = A.change(doc, setDeleteFlag)
      docSet.setDoc(docId, deletedDoc)
    }
  }

  // REDUCERS

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
    [idToKey(id)]: setDeleteFlag,
  })

  return {
    keyName,
    reducers: {
      drop,
      add,
      update,
      remove,
    },
    selectors: {
      keys,
      getAll,
      getMap,
      count,
    },
    removeAll,
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
