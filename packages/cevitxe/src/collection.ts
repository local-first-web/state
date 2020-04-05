import { DELETED, GLOBAL } from './constants'
import A, { ChangeFn } from 'automerge'
import { DELETE_COLLECTION } from './constants'
import { ChangeMap, RepoSnapshot, Snapshot } from 'cevitxe-types'
import { Repo } from './Repo'

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
 * flags for modifying the repo and/or one or many docs.
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
 *
 * ## Internals
 *
 * ### How collections are stored
 *
 * Multiple collections can be stored side-by-side in a single `Repo`, with each item as an
 * individual root-level Automerge document. So a `Repo` might look something like this:
 * ```ts
 * {
 *   '__teachers__abcdef1234': {id: 'abcdef1234', first: 'Herb', last: 'Caudill' },
 *   '__teachers__qrs7890xyz': {id: 'qrs7890xyz', first: 'Diego', last: 'Mijelshon' },
 *   '__students__lmnopqrs12': {id: 'lmnopqrs12', first: 'Steve', last: 'Jobs' },
 *   '__students__qwerty1234': {id: 'qwerty1234', first: 'Steve', last: 'Wozniak' },
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
 *    1. We mark them as deleted by adding a special DELETED flag. This allows the deletion to be
 *       persisted and propagated to peers.
 *       ```ts
 *       {
 *         '__teachers__abcdef1234': {id: 'abcdef1234', first: 'Herb', last: 'Caudill', [DELETED]: true },
 *         '__teachers__qrs7890xyz': {id: 'qrs7890xyz', first: 'Diego', last: 'Mijelshon' },
 *       }
 *       ```
 *    2. The repo then looks out for the DELETED flag and removes deleted items from the snapshot.
 *       (We don't ever delete the underlying change history, in case the document is undeleted.)
 *
 *
 * ### Dropping a collection
 *
 * We want to be able to drop a collection in a single action from a reducer, but we don't have an index
 * So instead of returning reducer functions, we return a new object keyed to the
 * collection name and containing just the DELETE_COLLECTION flag.
 * ```ts
 * {
 *   '__teachers__abcdef1234': {id: 'abcdef1234', first: 'Herb', last: 'Caudill', ['__DELETED']: true },
 *   '__teachers__qrs7890xyz': {id: 'qrs7890xyz', first: 'Diego', last: 'Mijelshon' },
 *   '__teachers': DELETE_COLLECTION
 * }
 * ```
 */
export function collection<T = any>(name: string, { idField = 'id' }: CollectionOptions = {}) {
  const keyName = collection.getKeyName(name)

  // these are for converting individual item IDs back and forth
  const idToKey = (id: string) => `${keyName}__${id}`
  const keyToId = (key: string) => key.replace(`${keyName}__`, '')

  const setDeleteFlag = (s: any) => Object.assign(s, { [DELETED]: true })

  /**
   * Returns true if the given string is a key for this collection
   * @param maybeKey
   */
  const isCollectionKey = (maybeKey: string) => maybeKey.startsWith(`${keyName}__`)

  /**
   * Iterates over all keys for the collection when given the current redux state.
   * @param state The plain JSON representation of the state.
   */
  function* keys(state: RepoSnapshot = {}) {
    for (const key in state) {
      const item = (state as any)[key]
      const shouldInclude = item && !item[DELETED]
      if (isCollectionKey(key) && shouldInclude) yield key
    }
  }

  const reducers = {
    /**
     * Takes one or more new items, and returns a change function for each that adds it to the collection.
     * @param item An item (or array of items) to be added
     * @returns A change function
     *
     */
    add: (item: A.Doc<T> | A.Doc<T>[]) => {
      const items: A.Doc<T>[] = Array.isArray(item) ? item : [item]
      const changeFunctions = {} as ChangeMap
      for (const item of items) {
        if (!item.hasOwnProperty(idField))
          throw new Error(`Item doesn't have a property called '${idField}'.`)
        const key = idToKey((item as any)[idField])
        changeFunctions[key] = (s: A.Doc<T>) => Object.assign(s, item)
      }
      return changeFunctions
    },

    /**
     * Takes an updated version of the given doc (can be partial); returns a function merging the
     * updates with the existing doc, mapped to the collection key corresponding to the id field in
     * item.
     * @param item An object containing the id of the item to modify, as well as the values to be
     * modified. This can be either a modified copy of the whole document, or just the fields to be
     * changed.
     */
    update: (item: A.Doc<any>) => ({
      [idToKey(item[idField])]: (s: any) => Object.assign(s, item),
    }),

    /**
     * Takes an id and a change function, and returns an object with the function mapped to the id.
     * @param id The id of the item to change
     * @param fn The change function
     * @returns The function mapped to the collection key
     * @example
     *   ```js
     *   const markComplete = (s) => { ...s, complete: true }
     *   return change('abc', markComplete)
     *   // returns { _tasks_abc: (s) => {...s, complete: true }
     *   ```
     */
    change: (id: string, fn: ChangeFn<T>) => ({
      [idToKey(id)]: fn,
    }),

    /**
     * Takes an id, and returns a delete flag mapped to the collection key.
     */
    remove: ({ id }: { id: string }) => ({
      [idToKey(id)]: setDeleteFlag,
    }),

    /**
     * Marks the collection to be dropped.
     * @returns An object with the keyName of the collection; instead of a change function, the
     * value is the DELETE_COLLECTION flag. e.g. `{ _widgets: DELETE_COLLECTION }`
     */
    drop: () => {
      return { [keyName]: DELETE_COLLECTION }
    },
  }

  // COLLECTION OBJECT

  return {
    reducers,
    keys,
    idToKey,
    keyToId,
    isCollectionKey,
  }
}

export namespace collection {
  /**
   * Given the collection's name, returns the `keyName` used internally for tracking the collection.
   *
   * @param {string} collectionName The collection name, e.g. `teachers`
   * @return The key name used internally for the collection (e.g. `__teachers`)
   */
  export const getKeyName = (collectionName: string): string => `__${collectionName}`

  /**
   * Given a collection's `keyName`, returns the collection's name.
   *
   * @param {string} keyName The key name used internally for the collection (e.g. `__teachers`)
   * @return The collection name, e.g. `teachers`
   */
  export const getCollectionName = (keyName: string): string => keyName.replace(/^__/, '')

  /**
   * Normalizes a state object into a map of objects that can be turned into Automerge documents.
   *
   * This is intended to solve two problems:
   *
   * 1. Automerge's overhead makes it inefficient to deal with very large arrays (over 10,000 or so
   *    elements), so we treat these as collections and create one document per element.
   * 2. Scalars and arrays can't be turned into Automerge documents; so we gather any non-collection
   *    elements from the root and store them in a special "global" document.
   *
   * For example:
   *
   * ```js
   * const state = {
   *   visibilityFilter: 'all',
   *   todos: {
   *     abc123: {},
   *     qrs666: {},
   *   },
   * }
   *
   * const result = normalize(state) // returns:
   *
   * {
   *   __global: {
   *     visibilityFilter: 'all',
   *   },
   *   __todos__abc123: {},
   *   __todos__qrs666: {},
   * }
   *```
   * @see denormalize
   * @param state The object to be normalized.
   * @param collections An array containing the names of all elements in `state` to be treated as
   * collections.
   * @returns the normalized state
   */
  export const normalize = (state: Snapshot, collections: string[]): Snapshot => {
    const _state = { ...state } // shallow clone
    let normalizedState = {} as Snapshot

    // First, we handle collections.
    for (const c of collections) {
      const collectionElements = _state[c] // e.g. state.todos
      for (const id in collectionElements) {
        const key = collection(c).idToKey(id) // e.g. abc123 => __todos__abc123
        normalizedState[key] = collectionElements[id]
      }

      // remove the original collection object, so only non-collection elements are left
      delete _state[c]
    }

    // put everything else in a global document
    normalizedState[GLOBAL] = { ..._state }

    return normalizedState
  }

  /**
   * Reverses the operation of `normalize`.
   * @see normalize
   * @param state The normalized state to denormalize
   * @param collections An array containing the names of all collections used in normalizing `state`.
   */
  export const denormalize = (state: Snapshot, collections: string[]): Snapshot => {
    // get everything from the global document
    const denormalizedState = {
      ...state[GLOBAL],
    } as Snapshot

    // add each collection
    for (const c of collections) {
      const denormalizedMap = {} as Snapshot
      for (const key of collection(c).keys(state)) {
        const id = collection(c).keyToId(key)
        if (state[key] && state[key][DELETED] !== true) {
          denormalizedMap[id] = state[key]
        }
      }
      denormalizedState[c] = denormalizedMap
    }
    return denormalizedState
  }
}
