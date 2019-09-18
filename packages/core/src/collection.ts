import A, { Doc } from 'automerge'
import { DELETE_COLLECTION } from './constants'
import { DocSet } from './lib/automerge'
import { ChangeMap } from './types'
import { docSetToObject } from './docSetHelpers'

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
  // TODO: finish documenting internal mechanics
  /*
    ## Internals
   */
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
  const getKeys = (state: State<T>): string[] =>
    Object.keys(state || {})
      .filter((key: string) => key.startsWith(`${keyName}::`))
      .filter((key: string) => !(state as any)[key][DELETED])

  /**
   * Given the redux state, returns an array containing all items in the collection.
   * @param state The plain JSON representation of the state.
   */
  const toArray = (state: State<T> = {}) => getKeys(state).map((key: string) => state[key])

  /**
   * Given the redux state, returns a map keying each item in the collection to its `id`.
   * @param state The plain JSON representation of the state.
   */
  const toMap = (state: State<T> = {}): State<T> =>
    getKeys(state).reduce((result, key) => ({ ...result, [keyToId(key)]: state[key] }), {})

  /**
   * Returns the number of items in the collection when given the redux state.
   * @param state The plain JSON representation of the state.
   */
  const count = (state: State<T> = {}) => getKeys(state).length

  const deleteAll = (docSet: DocSet<any>) => {
    const docIds = getKeys(docSetToObject(docSet))
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
    getKeys,
    toArray,
    toMap,
    count,
    deleteAll,
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
