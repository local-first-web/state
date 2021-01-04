import A from 'automerge'
import { AnyAction } from 'redux'
export { ChangeFn } from 'automerge'
import { Clock, Snapshot, SnapshotRecord, ChangeSet } from '@localfirst/storage-abstract'
export { Snapshot } from '@localfirst/storage-abstract'

// change function operating on a specific item in a collection
type CollectionChange<T> = {
  collection: string
  id: string
  fn: A.ChangeFn<T>
}

// delete a specific item in a collection
type DeleteFlag = {
  collection: string
  id: string
  delete: true
}

// drop an entire collection
type DropFlag = {
  collection: string
  drop: true
}

export type ChangeManifest<T> = A.ChangeFn<T> | CollectionChange<T> | DeleteFlag | DropFlag

// type guards
type CM<T> = ChangeManifest<T> // shorthand
export const isFunction = <T>(x: CM<T>): x is A.ChangeFn<T> => typeof x === 'function'
export const isChange = <T>(x: CM<T>): x is CollectionChange<T> => x.hasOwnProperty('fn')
export const isDeleteFlag = (x: CM<any>): x is DeleteFlag => x.hasOwnProperty('delete')
export const isDropFlag = (x: CM<any>): x is DropFlag => x.hasOwnProperty('drop')

export type ProxyReducer<T = any> = (
  state: T,
  action: AnyAction
) => null | ChangeManifest<T> | ChangeManifest<T>[]

/**
 * For each document, we have a `Clock`. A ClockMap maps all documentIds that we have to the
 * corresponding `Clock`. */
export declare type ClockMap = {
  [documentId: string]: Clock
}

/**
 * Associates documentIds with a change function to be executed by the reducer.
 */
export interface ChangeMap {
  [documentId: string]: A.ChangeFn<any> | symbol
}

/**
 * `RepoHistory` is an object mapping each `documentId` to an array of changes representing the
 * corresponding document's entire history.
 */
export declare type RepoHistory = {
  [documentId: string]: A.Change[]
}

/**
 * `RepoSnapshot` is a plain JavaScript representation of a repo's contents. It is an object, each
 * property of which is also an object; so any primitive values or arrays need to be nested a couple
 * of levels in.
 */
export interface RepoSnapshot {
  [documentId: string]: Snapshot | null
}

export * from '@localfirst/storage-abstract'

export function ensure<T>(arg: T | undefined) {
  if (!arg) { throw new Error('BUG: Assertion failed and argument was undefined at this point in time')}
  return arg
}