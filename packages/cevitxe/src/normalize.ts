import { Snapshot } from 'cevitxe-types'

import { collection } from './collection'
import { GLOBAL } from './constants'

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
 * @param state The object to be normalized.
 * @param collections An array containing the names of all elements in `state` to be treated as
 * collections.
 * @returns the normalized state
 */
export const normalize = (state: Snapshot, collections: string[]): Snapshot => {
  const _state = { ...state } // shallow clone
  const normalizedState = {} as Snapshot

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
  const _state = { ...state }

  // get everything from the global document
  const denormalizedState = {
    ..._state[GLOBAL],
  } as Snapshot

  // add each collection
  for (const c of collections) denormalizedState[c] = collection(c).selectors.getMap(_state)

  return denormalizedState
}
