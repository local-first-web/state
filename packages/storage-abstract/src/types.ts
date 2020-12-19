import A from 'automerge'

/**
 * A vector clock provides a logical ordering of events and states in a distributed system. It
 *  associates each actor in a system with a counter that is incremented each time that actor makes a
 *  change. See https://en.wikipedia.org/wiki/Vector_clock.
 */
export declare type Clock = {
  [actorId: string]: number
}

/**
 * Every time one or more changes are made, we store them in a `ChangeSet`.
 */
export interface ChangeSet {
  /** The ID of the document */
  documentId: string
  /** The name of the collection this ChangeSet applies to */
  collection?: string
  /** One or more Automerge changes made to the document */
  changes: A.Change[]
}

/**
 * A snapshot is the state of a document at a specific point in time, with no Automerge metadata.
 */
export interface Snapshot {
  [key: string]: any
}

/**
 * We store each `Snapshot` along with some metadata in a `SnapshotRecord`.
 */
export interface SnapshotRecord {
  /** The ID of the document */
  documentId: string
  /** The name of the collection this SnapshotRecord applies to */
  collection?: string
  /** The snapshot itself */
  snapshot: Snapshot
  /** The vector clock when the snapshot was taken  */
  clock: Clock
}
