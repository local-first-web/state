import { RepoSnapshot, Snapshot } from 'cevitxe-types'
import { DELETED, GLOBAL } from './constants'

/**
 * @param name The name of the collection.
 * @param idField The property of an object containing a unique identifier, normally a uuid.
 * Optional; defaults to 'id'.
 */
export class Collection<T = any> {
  private name: string
  private keyName: string
  constructor(name: string) {
    this.name = name
    this.keyName = Collection.getKeyName(name)
  }

  // these are for converting individual item IDs back and forth
  public idToKey = (id: string) => `${this.keyName}__${id}`
  public keyToId = (key: string) => key.replace(`${this.keyName}__`, '')

  /**
   * Returns true if the given string is a key for this collection
   * @param maybeKey
   */
  public isCollectionKey(maybeKey: string) {
    return maybeKey.startsWith(`${this.keyName}__`)
  }

  /**
   * Iterates over all keys for the collection when given the current redux state.
   * @param state The plain JSON representation of the state.
   */
  *keys(state: RepoSnapshot = {}) {
    for (const key in state) {
      const item = (state as any)[key]
      const shouldInclude = item && !item[DELETED]
      if (this.isCollectionKey(key) && shouldInclude) yield key
    }
  }

  /**
   * Given the collection's name, returns the `keyName` used internally for tracking the collection.
   *
   * @param {string} collectionName The collection name, e.g. `teachers`
   * @return The key name used internally for the collection (e.g. `__teachers`)
   */
  static getKeyName(collectionName: string): string {
    return `__${collectionName}`
  }

  /**
   * Given a collection's `keyName`, returns the collection's name.
   *
   * @param {string} keyName The key name used internally for the collection (e.g. `__teachers`)
   * @return The collection name, e.g. `teachers`
   */
  static getCollectionName(keyName: string): string {
    return keyName.replace(/^__/, '')
  }

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
   * // denormalized state (exposed to application)
   * {
   *   visibilityFilter: 'all',
   *   todos: {
   *     abc123: {},
   *     qrs666: {},
   *   },
   * }
   *
   * // normalized state (for storage)
   * {
   *   __global: { visibilityFilter: 'all' }, // 🡐 Automerge doc
   *   __todos__abc123: {}, // 🡐 Automerge doc
   *   __todos__qrs666: {}, // 🡐 Automerge doc
   * }
   *```
   * @see denormalize
   * @param state The object to be normalized.
   * @param collections An array containing the names of all elements in `state` to be treated as
   * collections.
   * @returns the normalized state
   */
  static normalize(state: Snapshot, collections: string[]): Snapshot {
    const _state = { ...state } // shallow clone
    let normalizedState = {} as Snapshot

    // First, we handle collections.
    for (const c of collections) {
      const collectionElements = _state[c] // e.g. state.todos
      for (const id in collectionElements) {
        const key = new Collection(c).idToKey(id) // e.g. abc123 => __todos__abc123
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
  static denormalize(state: Snapshot, collections: string[]): Snapshot {
    // get everything from the global document
    const denormalizedState = {
      ...state[GLOBAL],
    } as Snapshot

    // add each collection
    for (const c of collections) {
      const denormalizedMap = {} as Snapshot
      const collection = new Collection(c)
      for (const key of collection.keys(state)) {
        const id = collection.keyToId(key)
        if (state[key] && state[key][DELETED] !== true) {
          denormalizedMap[id] = state[key]
        }
      }
      denormalizedState[c] = denormalizedMap
    }
    return denormalizedState
  }
}
