import { RepoHistory } from './types'
import A from 'automerge'
import { newid } from 'cevitxe-signal-client'
import debug from 'debug'
import { EventEmitter } from 'events'
import * as idb from 'idb/with-async-ittr-cjs'
import { ChangeSet, RepoSnapshot } from './types'
import { DELETED } from './collection'
import Cache from 'lru-cache'

const DB_VERSION = 1
export type RepoEventHandler<T> = (documentId: string, doc: A.Doc<T>) => void | Promise<void>

/**
 *
 * ### Storage schema
 *
 * We use a single database with two object stores: `feeds`, containing changesets in sequential
 * order, indexed by documentId; and `snapshots`, containing an actual
 *
 * There is one repo (and one database) per discovery key.
 * ```
 * cevitxe::grid::fancy-lizard (DB)
 *   feeds (object store)
 *     1: { id:1, documentId: abc123, changeSet: [...]}
 *     2: { id:2, documentId: abc123, changeSet: [...]}
 *     3: { id:3, documentId: abc123, changeSet: [...]}
 *     4: { id:4, documentId: qrs567, changeSet: [...]}
 *     5: { id:5, documentId: qrs567, changeSet: [...]}
 *     6: { id:6, documentId: qrs567, changeSet: [...]}
 *   snapshots (object store)
 *     abc123: [snapshot]
 *     qrs567: [snapshot]
 * ```
 */
export class Repo<T = any> extends EventEmitter {
  private log: debug.Debugger

  /**
   * The discovery key is a unique ID for this dataset, used to identify it when seeking peers with
   * whom to synchronize. In the example apps we use randomly generated two-word names like
   * `golden-lizard`. It could also be a UUID.
   */
  private discoveryKey: string

  /**
   * Name to distinguish this application's data from others that this browser might have stored;
   * e.g. `grid` or `todos`.
   */
  public databaseName: string

  /**
   * Unique identifier representing this peer
   */
  public clientId: string

  /**
   * In-memory map of document snapshots.
   */
  private state: RepoSnapshot<T> = {}

  private docCache: Cache<string, any>

  /**
   * Document change event listeners. Each handler fires every time a document is set or removed.
   */
  private handlers: Set<RepoEventHandler<T>>

  private database?: idb.IDBPDatabase<unknown>

  constructor(discoveryKey: string, databaseName: string, clientId: string = newid()) {
    super()
    this.discoveryKey = discoveryKey
    this.databaseName = databaseName
    this.log = debug(`cevitxe:repo:${databaseName}`)
    this.handlers = new Set()
    this.docCache = new Cache({ max: 1000 })
    this.clientId = clientId
  }

  // PUBLIC METHODS

  /**
   * Opens the local database and returns a reference to it.
   * @returns An `idb` wrapper for an indexed DB.
   */
  async open() {
    const storageKey = `cevitxe::${this.databaseName}::${this.discoveryKey.substr(0, 12)}`
    this.database = await idb.openDB(storageKey, DB_VERSION, {
      upgrade(db) {
        // feeds
        const feeds = db.createObjectStore('feeds', {
          keyPath: 'id',
          autoIncrement: true,
        })
        feeds.createIndex('documentId', 'documentId')

        // snapshots
        const snapshots = db.createObjectStore('snapshots', {
          keyPath: 'documentId',
          autoIncrement: false,
        })
        snapshots.createIndex('documentId', 'documentId')
      },
    })
  }

  close() {
    if (this.database) {
      this.database.close()
      delete this.database
    }
  }

  /**
   * Initializes the repo and returns a snapshot of its current state.
   * @param initialState The starting state to use when creating a new repo.
   * @param creating Use `true` if creating a new repo, `false` if joining an existing repo (one
   * that we already created locally, or that a peer has)
   * @returns A snapshot of the repo's current state.
   */
  async init(initialState: any, creating: boolean): Promise<RepoSnapshot> {
    await this.open()
    const hasData = await this.hasData()
    this.log('hasData', hasData)
    if (creating) {
      this.log('creating a new repo')
      await this.createFromSnapshot(initialState)
    } else if (!hasData) {
      this.log(`joining a peer's document for the first time`)
      await this.createFromSnapshot({})
    } else {
      this.log('recovering an existing repo from persisted state')
      await this.loadSnapshotsFromDb()
    }
    this.emit('ready')
    return this.state
  }

  /**
   * Determines whether the repo has previously persisted data or not.
   * @returns `true` if there is any stored data in the repo.
   */
  async hasData() {
    const count = await this.database!.count('feeds')
    return count > 0
  }

  /**
   * Creates a new repo with the given initial state
   * @param initialState
   */
  async createFromSnapshot(state: RepoSnapshot<T>) {
    for (let documentId in state) {
      const snapshot = state[documentId]
      if (snapshot !== null) {
        const document = A.from(snapshot)
        await this.set(documentId, document)
      }
    }
  }

  /**
   * Returns all of the repo's document IDs from memory.
   */
  get documentIds() {
    return Object.keys(this.state)
  }

  /**
   * @returns true if this repo has this document (even if it's been deleted)
   */
  has(documentId: string): boolean {
    // if the document has been deleted, its snapshot set to `null`, but the map still contains the entry
    return this.state.hasOwnProperty(documentId)
  }

  /**
   * Returns the number of document IDs that this repo has (including deleted)
   */
  get count() {
    return this.documentIds.length
  }

  /**
   * Reconstitutes an Automerge document from its change history
   * @param documentId
   */
  async get(documentId: string): Promise<A.Doc<T>> {
    // TODO: reimplement caching
    this.log('get', documentId)
    const doc = await this.reconstructDoc(documentId)
    return doc
  }

  /**
   * Saves the document's change history and snapshot, and updates our in-memory state.
   * @param documentId The ID of the document
   * @param doc The new version of the document
   * @param changes (optional) If we're already given the changes (e.g. in `applyChanges`), we can
   * pass them in so we don't have to recalculate them.
   */
  async set(documentId: string, doc: A.Doc<T>) {
    this.log('set', documentId, doc)
    // look up old doc and generate diff
    const oldDoc = await this.reconstructDoc(documentId)
    const changes = A.getChanges(oldDoc, doc)

    // cache the doc
    this.log('set: caching', documentId, doc)
    this.docCache.set(documentId, doc)

    // append changes to this document's history
    if (changes.length > 0) await this.appendChangeset({ documentId, changes })

    // save snapshot
    await this.saveSnapshot(documentId, doc)

    // call handlers
    for (const fn of this.handlers) {
      await fn(documentId, doc)
    }
  }

  /**
   * Updates a document using an Automerge change function (e.g. from a reducer)
   * @param documentId The ID of the document
   * @param changeFn An Automerge change function
   * @returns The updated document
   */
  async change(documentId: string, changeFn: A.ChangeFn<T>) {
    // apply changes to document
    const oldDoc = await this.reconstructDoc(documentId)
    const newDoc = A.change(oldDoc, changeFn)

    // save the new document, snapshot, etc.
    await this.set(documentId, newDoc)

    // return the modified document
    return newDoc
  }

  /**
   * Updates a document using a set of Automerge changes (typically received from a peer).
   * @param documentId The ID of the document
   * @param changes A diff in the form of an array of Automerge change objects
   * @returns The updated document
   */
  async applyChanges(documentId: string, changes: A.Change[]) {
    this.log('apply changes')
    // apply changes to document
    const doc = await this.reconstructDoc(documentId)
    const newDoc = A.applyChanges(doc, changes)

    // cache the doc
    this.docCache.set(documentId, newDoc)

    // append changes to this document's history
    if (changes.length > 0) await this.appendChangeset({ documentId, changes })

    // save snapshot
    await this.saveSnapshot(documentId, newDoc)

    // call handlers
    for (const fn of this.handlers) {
      await fn(documentId, newDoc)
    }

    // return the modified document
    return newDoc
  }

  /**
   * Gets the in-memory snapshot of a document
   * @param documentId
   * @returns Returns a plain JS object
   */
  getSnapshot(documentId: string) {
    return this.state[documentId]
  }

  /**
   * Changes the snapshot of a document synchronously, without modifying the underlying Automerge
   * changes. This is used to quickly update the UI; the change history can be updated later.
   * @param documentId
   * @param fn The change function (usually comes from a ProxyReducer)
   */
  changeSnapshot(documentId: string, fn: A.ChangeFn<T>) {
    // create a new automerge object from the current version's snapshot
    const oldDoc = this.getSnapshot(documentId) || {}
    const doc: A.Doc<any> = A.from(oldDoc)

    // apply the change
    const newDoc = A.change(doc, fn)

    // convert the result back to a plain object
    const snapshot = { ...newDoc }

    this.setSnapshot(documentId, snapshot)
    this.log('changed snapshot', documentId, snapshot)
  }

  /**
   * Sets the in-memory snapshot of a document. NOTE: This does not update the document's change
   * history or persist anything; this is just to allow synchronous updates of the state for UI
   * purposes.
   * @param documentId
   * @param snapshot
   */
  setSnapshot(documentId: string, snapshot: any) {
    if (snapshot.DELETED) {
      this.removeSnapshot(documentId)
    } else {
      this.state[documentId] = snapshot
    }
  }

  /**
   * Removes the snapshot with the given `documentId` from in-memory state. (More precisely, sets it
   * to `null` as a marker that we've seen the document before.)
   * @param documentId
   */
  removeSnapshot(documentId: string) {
    this.log('removeSnapshot', documentId)
    this.state[documentId] = null
  }

  /**
   * Returns the state of the entire repo, containing snapshots of all the documents.
   */
  getState(): RepoSnapshot<T> {
    return this.state
  }

  /**
   * Replaces the (snapshot) state of the entire repo. NOTE: This doesn't update the repo's change
   * history or persist anything; this is only used for synchronous updates of the state for UI
   * purposes.
   */
  loadState(replacementState: RepoSnapshot<T>) {
    this.state = replacementState
  }

  /**
   * Used for sending the entire current state of the repo to a new peer.
   * @returns Returns an object mapping documentIds to an array of changes.
   */
  async getHistory(): Promise<RepoHistory> {
    const history: RepoHistory = {}

    const index = this.database!.transaction('feeds').store.index('documentId')
    const changeSets = index.iterate(undefined, 'next')

    for await (const cursor of changeSets) {
      const { documentId, changes } = cursor.value as ChangeSet
      history[documentId] = (history[documentId] || []).concat(changes)
    }
    return history
  }

  /**
   * Used when receiving the entire current state of a repo from a peer.
   */
  async loadHistory(history: RepoHistory) {
    for (const documentId in history) {
      const changes = history[documentId]
      await this.appendChangeset({ documentId, changes })
    }
  }

  /**
   * Adds a change event listener
   * @param handler
   */
  addHandler(handler: RepoEventHandler<T>) {
    this.handlers.add(handler)
  }

  /**
   * Removes a change event listener
   */
  removeHandler(handler: RepoEventHandler<T>) {
    this.handlers.delete(handler)
  }

  // PRIVATE

  /**
   * Loads all the repo's snapshots into memory
   */
  private async loadSnapshotsFromDb() {
    const snapshots = await this.database!.getAll('snapshots')
    for (const { documentId, snapshot } of snapshots) {
      if (snapshot === null || snapshot[DELETED]) {
        // omit deleted documents
      } else {
        this.state[documentId] = snapshot
      }
    }
  }

  /**
   * Recreates an Automerge document from its change history
   * @param documentId
   */
  private async reconstructDoc(documentId: string): Promise<A.Doc<T>> {
    let doc = A.init<T>({ actorId: this.clientId })
    const changeSets = await this.getChangesets(documentId)
    for (const { changes } of changeSets) {
      if (changes) doc = A.applyChanges(doc, changes)
    }
    return doc
  }

  /**
   * Adds a set of changes to the document's append-only history.
   * @param changeSet
   */
  private async appendChangeset(changeSet: ChangeSet) {
    this.log('appending changeset', changeSet.documentId, changeSet.changes.length)
    await this.database!.add('feeds', changeSet)
  }

  /**
   * Gets all stored changesets from a document's history.
   * @param documentId The ID of the requested document.
   * @returns An array of changesets in order of application.
   */
  private async getChangesets(documentId: string): Promise<ChangeSet[]> {
    const changeSets = await this.database!.getAllFromIndex('feeds', 'documentId', documentId)
    this.log('getChangeSets', documentId, changeSets.length)
    return changeSets
  }

  /**
   * Saves the snapshot for the given `documentId`, replacing any existing snapshot.
   * @param documentId
   * @param snapshot
   */
  private async saveSnapshot(documentId: string, document: A.Doc<T>) {
    const snapshot: any = { ...document } // clone without Automerge metadata
    if (snapshot[DELETED]) {
      this.removeSnapshot(documentId)
      await this.database!.delete('snapshots', documentId)
    } else {
      this.log('saveSnapshot', documentId, document)
      this.setSnapshot(documentId, snapshot)
      await this.database!.put('snapshots', { documentId, snapshot })
    }
  }
}
