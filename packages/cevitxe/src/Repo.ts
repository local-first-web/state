import A from 'automerge'
import { newid } from 'cevitxe-signal-client'
import { StorageAdapter } from 'cevitxe-storage-abstract'
import { IdbAdapter } from 'cevitxe-storage-indexeddb'
import {
  ChangeManifest,
  ChangeSet,
  Clock,
  ClockMap,
  isDeleteFlag,
  isDropFlag,
  isFunction,
  RepoHistory,
  RepoSnapshot,
} from 'cevitxe-types'
import debug from 'debug'
import { clone } from 'ramda'
import { EMPTY_CLOCK, getClock, mergeClocks } from './clocks'
import { collection } from './collection'
import { DELETED, GLOBAL } from './constants'

/**
 * A Repo manages a set of Automerge documents. For each document, it persists:
 *   1. the document history (in an append-only log of changes), and
 *   2. a snapshot of the document's latest state.
 *
 * Each repo is uniquely identified by a discovery key.
 *
 * A repo is instantiated by StoreManager when creating or joining a store. Actions coming from the
 * store are passed onto the repo, as are changes received from peers.
 */
export class Repo<T = any> {
  private log: debug.Debugger
  private storage: StorageAdapter

  public collections: string[]

  public databaseName: string
  public clientId: string

  /** In-memory map of document snapshots */
  private state: RepoSnapshot = {}

  /** In-memory map of document clocks */
  public clock: ClockMap = {}

  /** Document change event listeners. Each handler fires every time a document is set or removed. */
  private handlers: Set<RepoEventHandler<T>> = new Set()

  constructor({
    discoveryKey,
    databaseName,
    clientId = newid(),
    storage = new IdbAdapter({ databaseName, discoveryKey }),
    collections = [],
  }: RepoOptions) {
    this.log = debug(`cevitxe:repo:${databaseName}`)

    this.databaseName = databaseName
    this.clientId = clientId
    this.collections = collections
    this.storage = storage
  }

  // PUBLIC METHODS

  open = async () => await this.storage.open()
  close = () => this.storage.close()

  /**
   * Initializes the repo and returns a snapshot of its current state.
   * @param initialState The starting state to use when creating a new repo.
   * @param create Use `true` if creating a new repo, `false` if joining an existing repo (one
   * that we already created locally, or that a peer has)
   * @returns A snapshot of the repo's current state.
   */
  public async init(initialState: any, create: boolean): Promise<RepoSnapshot> {
    await this.open()
    const hasData = await this.hasData()
    this.log('hasData', hasData)
    if (create) {
      this.log('creating a new repo')
      const normalizedState = collection.normalize(initialState, this.collections)
      for (let documentId in normalizedState) {
        const snapshot = normalizedState[documentId]
        if (snapshot !== null) {
          const document = A.from(snapshot)
          await this.set(documentId, document)
        }
      }
    } else if (!hasData) {
      this.log(`joining a peer's document for the first time`)
    } else {
      this.log('recovering an existing repo from persisted state')
      await this.loadSnapshotsFromDb()
    }
    return this.getAllSnapshots()
  }

  private get ids() {
    return Object.keys(this.state)
  }

  /** @returns true if this repo has this document (even if it's been deleted) */
  public has(documentId: string): boolean {
    // if the document has been deleted, its snapshot set to `null`, but the map still contains the entry
    return this.state.hasOwnProperty(documentId)
  }

  /** Returns the number of document IDs that this repo has (including deleted) */
  public get count() {
    return this.ids.length
  }

  /** Reconstitutes an Automerge document from its change history  */
  public async get(documentId: string): Promise<A.Doc<T> | undefined> {
    this.log('get', documentId)
    return await this.reconstruct(documentId)
  }

  /**
   * Saves the document's change history and snapshot, and updates our in-memory state.
   * @param documentId The ID of the document
   * @param doc The new version of the document
   * @param changes (optional) If we're already given the changes (e.g. in `applyChanges`), we can
   * pass them in so we don't have to recalculate them.
   */
  public async set(documentId: string, doc: A.Doc<any>, changes?: A.Change[]) {
    this.log('set', documentId, doc)

    // look up old doc and generate diff
    if (!changes) {
      const oldDoc = (await this.reconstruct(documentId)) || A.init()
      try {
        changes = A.getChanges(oldDoc, doc)
      } catch (error) {
        this.log({ error, oldDoc, doc })
        changes = []
      }
    }

    // only if Automerge actually found changes in the new document...
    if (changes.length > 0) {
      // append changes to this document's history
      await this.appendChanges({ documentId, changes })

      // save snapshot
      await this.saveSnapshot(documentId, doc)

      // call handlers
      for (const fn of this.handlers) await fn(documentId, doc)
    }
  }

  /**
   * Updates a document using an Automerge change function (e.g. from a reducer)
   * @param documentId The ID of the document
   * @param changeFn An Automerge change function
   * @returns The updated document
   */
  public async change(
    documentId: string,
    changeFn: A.ChangeFn<T>,
    {
      collectionName,
      snapshotOnly = false,
    }: { collectionName?: string; snapshotOnly?: boolean } = {}
  ) {
    this.log('change', documentId)

    const key = collectionName ? collection(collectionName).idToKey(documentId) : documentId

    if (snapshotOnly) {
      // create a new throw-away automerge object from the current version's snapshot
      const oldDoc = A.from(clone(this.getSnapshot(key) || {}))

      // apply the change
      const newDoc = A.change(oldDoc, changeFn)

      // convert the result back to a plain object
      const snapshot = clone(newDoc)

      this.setSnapshot(key, snapshot)
      this.log('changed snapshot', key, snapshot)
    } else {
      // apply changes to document
      const oldDoc = (await this.reconstruct(key)) || A.init()
      const newDoc = A.change(oldDoc, changeFn)

      // save the new document, snapshot, etc.
      await this.set(key, newDoc)
    }
  }

  /**
   * Updates a document using a set of Automerge changes (typically received from a peer).
   * @param documentId The ID of the document
   * @param changes A diff in the form of an array of Automerge change objects
   * @returns The updated document
   */
  public async applyChanges(documentId: string, changes: A.Change[]) {
    // apply changes to document
    const doc = (await this.reconstruct(documentId)) || A.init()
    const newDoc = A.applyChanges(doc, changes)

    await this.set(documentId, newDoc, changes)

    // return the modified document
    return newDoc
  }

  /**
   * Updates a document from a change manifest. This is called either
   * - from a reducer (in which case `snapshotOnly` will be true and this will happen
   *   synchronously); or
   * - from middleware (in which case `snapshotOnly` will be false and this will happen
   *   asynchronously).
   * @param cm The ChangeManifest contains information about what needs to change. Can be:
   * - a function that is applied to the GLOBAL document
   * - an object containing a function, along with the name of the collection and the id of the
   *   document to apply it to
   * - an object containing the name of a collection, and id, and a `delete` flag, indicating that
   *   the item should be deleted
   * - an object containing the name of a collection and a `drop` flag, indicating that the
   *   collection should be dropped
   * @param snapshotOnly Indicates whether the changes should be made to snapshots (synchronously),
   * or to the change history (asynchronously)
   */
  public async applyChangeManifest(cm: ChangeManifest<any>, snapshotOnly: boolean = false) {
    if (isDropFlag(cm)) {
      await this.drop(cm.collection, snapshotOnly)
    } else {
      const fn = isFunction(cm) ? (cm as A.ChangeFn<any>) : isDeleteFlag(cm) ? setDeleteFlag : cm.fn
      const id = isFunction(cm) ? GLOBAL : cm.id
      const collectionName = isFunction(cm) ? undefined : cm.collection
      await this.change(id, fn, { collectionName, snapshotOnly })
    }
  }

  /**
   * Marks all documents belonging to the given collection as deleted
   * @param collectionName The name of the collection (e.g. `widgets`)
   */
  public async drop(collectionName: string, snapshotOnly: boolean = false) {
    const isInCollection = collection(collectionName).isCollectionKey
    for (const documentId of this.ids.filter(isInCollection))
      if (snapshotOnly) this.deleteSnapshot(documentId)
      else await this.change(documentId, setDeleteFlag)
  }

  /**
   * Used for sending the entire current state of the repo to a new peer.
   * @returns  an object mapping documentIds to an array of changes.
   */
  public async *getHistory(batchSize: number = 1000): AsyncGenerator<RepoHistory> {
    let history: RepoHistory = {}
    let i = 0
    for await (const { documentId, changes } of this.storage.changes()) {
      history[documentId] = (history[documentId] || []).concat(changes)
      if (i++ > batchSize) {
        yield history
        i = 0
        history = {}
      }
    }
    yield history
  }

  /** Used when receiving the entire current state of a repo from a peer. */
  public async loadHistory(history: RepoHistory) {
    for (const documentId in history) {
      const changes = history[documentId]
      await this.applyChanges(documentId, changes)
    }
  }

  // SNAPSHOTS

  /**
   * Gets the in-memory snapshot of a document
   * @param documentId
   * @returns  a plain JS object
   */
  getSnapshot(documentId: string) {
    return this.state[documentId]
  }

  /**
   * Sets the in-memory snapshot of a document.
   * > NOTE: This does not update the document's change history or persist anything; it's just to
   * allow synchronous updates of the state for UI purposes.
   * @param documentId
   * @param snapshot
   */
  setSnapshot(documentId: string, snapshot: any) {
    if (snapshot.DELETED) this.deleteSnapshot(documentId)
    else this.state[documentId] = snapshot
  }

  /**
   * Removes the snapshot with the given `documentId` from in-memory state. (More precisely, sets it
   * to `null`, so we don't forget that we've seen the document before.)
   * @param documentId
   */
  deleteSnapshot(documentId: string) {
    this.log('removeSnapshot', documentId)
    this.state[documentId] = null
  }

  /** Returns the state of the entire repo, containing snapshots of all the documents. */
  getAllSnapshots(): RepoSnapshot {
    return collection.denormalize(this.state, this.collections)
  }

  /**
   * Replaces the (snapshot) state of the entire repo.
   * > NOTE: This doesn't update the repo's change history or persist anything; this is only used
   * for synchronous updates of the state for UI purposes.
   */
  setAllSnapshots(state: RepoSnapshot) {
    this.state = Object.assign(this.state, state)
  }

  // CLOCKS

  /**
   * Accessor for a document's clock
   * @param documentId
   * @returns Our clock, or if none exists, an empty clock
   */
  public getClock(documentId: string) {
    return this.clock[documentId] || EMPTY_CLOCK
  }

  /** Returns our entire ClockMap as-is */
  public getAllClocks() {
    return this.clock
  }

  /**
   * Updates the vector clock by merging in the new vector clock `clock`, setting each node's
   * sequence number to the maximum for that node
   * @param documentId
   * @param newClock
   */
  public updateClock(documentId: string, newClock: Clock) {
    const oldClock = this.clock[documentId]
    this.clock[documentId] = mergeClocks(oldClock, newClock)
  }

  // HANDLERS

  /** Adds a change event listener */
  addHandler(handler: RepoEventHandler<T>) {
    this.handlers.add(handler)
  }

  /** Removes a change event listener */
  removeHandler(handler: RepoEventHandler<T>) {
    this.handlers.delete(handler)
  }

  // PRIVATE METHODS

  /** @returns `true` if there is any stored data in the repo. */
  private async hasData() {
    return this.storage.hasData()
  }

  /** Loads all the repo's snapshots into memory */
  private async loadSnapshotsFromDb() {
    // TODO: only problem with this approach is that we're not storing clocks for deleted documents
    for await (const { documentId, snapshot, clock } of this.storage.snapshots()) {
      this.state[documentId] = snapshot[DELETED] ? null : snapshot
      this.clock[documentId] = clock
    }
  }

  /** Recreates an Automerge document from its change history */
  private async reconstruct(documentId: string): Promise<A.Doc<T> | undefined> {
    if (!this.has(documentId)) return undefined
    let doc = A.init<T>({ actorId: this.clientId })
    const changeSets = await this.getChanges(documentId)
    for (const { changes } of changeSets) //
      if (changes) doc = A.applyChanges(doc, changes)
    return doc
  }

  /** Adds a set of changes to the document's append-only history. */
  private async appendChanges(changeSet: ChangeSet) {
    this.log('appendChangeSet', changeSet.documentId, changeSet.changes.length)
    this.storage.appendChanges(changeSet)
  }

  /**
   * Gets all stored changesets from a document's history.
   * @param documentId The ID of the requested document.
   * @returns An array of changesets in order of application.
   */
  private async getChanges(documentId: string): Promise<ChangeSet[]> {
    this.log('getDocumentChanges', documentId)
    return this.storage.getChanges(documentId)
  }

  /** Saves the snapshot for the given `documentId`, replacing any existing snapshot. */
  private async saveSnapshot(documentId: string, document: A.Doc<T>) {
    const snapshot: any = clone(document)
    const clock = getClock(document)
    this.updateClock(documentId, clock)

    if (snapshot[DELETED]) {
      this.deleteSnapshot(documentId)
      await this.storage.deleteSnapshot(documentId)
    } else {
      this.log('saveSnapshot', documentId, document)
      this.setSnapshot(documentId, snapshot)
      await this.storage.putSnapshot({ documentId, snapshot, clock })
    }
  }
}

const setDeleteFlag = (s: any) => Object.assign(s || {}, { [DELETED]: true })

// TYPES

export type RepoEventHandler<T> = (documentId: string, doc: A.Doc<T>) => void | Promise<void>

interface RepoOptions {
  /** The discovery key is a unique ID for this dataset, used to identify it when seeking peers with
   *  whom to synchronize. In the example apps we use randomly generated two-word names like
   *  `golden-lizard`. It could also be a UUID. */
  discoveryKey: string

  /** Name to distinguish this application's data from others that this browser might have stored; * e.g. `grid` or `todos`. */
  databaseName: string

  /** Unique identifier representing this peer */
  clientId?: string

  /** Storage adapter to use. Defaults to `IdbAdapter` */
  storage?: StorageAdapter

  /** Collections */
  collections?: string[]
}
