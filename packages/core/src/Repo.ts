import A from 'automerge'
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
   * In-memory map of document snapshots.
   */
  public state: RepoSnapshot<T>

  private docCache: Cache<string, any>

  /**
   * Document change event listeners. Each handler fires every time a document is set or removed.
   */
  private handlers: Set<RepoEventHandler<T>>

  constructor(discoveryKey: string, databaseName: string) {
    super()
    this.discoveryKey = discoveryKey
    this.databaseName = databaseName
    this.log = debug(`cevitxe:repo:${databaseName}`)
    this.state = {}
    this.handlers = new Set()
    this.docCache = new Cache({ max: 1000 })
  }

  /**
   * Initializes the repo and returns a snapshot of its current state.
   * @param initialState The starting state to use when creating a new repo.
   * @param creating Use `true` if creating a new repo, `false` if joining an existing repo (locally
   * or with a peer)
   * @returns A snapshot of the repo's current state.
   */
  async init(initialState: any, creating: boolean): Promise<RepoSnapshot> {
    const hasData = await this.hasData()
    this.log('hasData', hasData)
    if (creating) {
      this.log('creating a new repo')
      this.state = initialState
      await this.create()
    } else if (!hasData) {
      this.log(`joining a peer's document for the first time`)
      this.state = {}
      await this.create()
    } else {
      this.log('recovering an existing repo from persisted state')
      await this.rebuildSnapshotsFromHistory()
    }
    this.emit('ready')
    return this.state
  }

  /**
   * Returns all of the repo's document IDs from memory.
   * Note: This does not include deleted documents
   */
  get documentIds() {
    return Object.keys(this.state)
  }

  /**
   * Reconstitutes an Automerge document from its change history
   * @param documentId
   */
  async get(documentId: string): Promise<A.Doc<T>> {
    if (!this.docCache.has(documentId)) {
      let doc = A.init<T>()
      const changeSets = await this.getChangesets(documentId)
      for (const { changes } of changeSets) {
        if (changes) doc = A.applyChanges(doc, changes)
        // TODO: probably don't need this 'isDelete' thing any more
        // else if (isDelete) await this.remove(documentId)
      }
      await this.setSnapshot(documentId, doc)
      this.docCache.set(documentId, doc)
    }
    return this.docCache.get(documentId)
  }

  /**
   * Saves the document's change history and snapshot, and updates our in-memory state.
   * @param documentId The ID of the document
   * @param doc The new version of the document
   * @param changes (optional) If we're already given the changes (e.g. in `applyChanges`), we can
   * pass them in so we don't have to recalculate them.
   */
  async set(documentId: string, doc: A.Doc<T>, changes?: A.Change[]) {
    this.log('set', documentId)
    if (!changes) {
      // look up old doc and generate diff
      const oldDoc = await this.get(documentId)
      changes = A.getChanges(oldDoc, doc)
    }

    // cache the doc
    this.docCache.set(documentId, doc)

    // append changes to this document's history
    await this.appendChangeset({ documentId, changes })

    // save snapshot
    await this.setSnapshot(documentId, doc)

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
    const doc = await this.get(documentId)
    const newDoc = A.change(doc, changeFn)

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
    // apply changes to document
    const doc = await this.get(documentId)
    const newDoc = A.applyChanges(doc, changes)

    // save the new document, snapshot, etc.
    await this.set(documentId, newDoc, changes)

    // return the modified document
    return newDoc
  }

  /**
   * Returns a snapshot of the document's current state.
   * @param documentId
   * @returns
   */
  async getSnapshot(documentId: string) {
    this.log('getSnapshot', documentId)
    if (!this.state.hasOwnProperty(documentId)) {
      const database = await this.openDB()
      const snapshotRecord = await database.get('snapshots', documentId)
      if (snapshotRecord) {
        const { snapshot } = snapshotRecord
        if (snapshot[DELETED]) {
          // omit deleted documents
        } else {
          this.state[documentId] = snapshot
        }
      }
      database.close()
    }
    return this.state[documentId]
  }

  /**
   * Saves the given object as a snapshot for the given `documentId`, replacing any existing
   * snapshot.
   * @param documentId
   * @param snapshot
   */
  async setSnapshot(documentId: string, document: A.Doc<T>) {
    this.log('setSnapshot', documentId, document)
    const snapshot = { ...document } // clone without Automerge metadata
    this.state[documentId] = snapshot
    const database = await this.openDB()
    await database.put('snapshots', { documentId, snapshot })
    database.close()
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
   * Determines whether the repo has previously persisted data or not.
   * @returns `true` if there is any stored data in the repo.
   */
  private async hasData() {
    const database = await this.openDB()
    const count = await database.count('feeds')
    return count > 0
  }

  /**
   * Opens the local database and returns a reference to it.
   * @returns An `idb` wrapper for an indexed DB.
   */
  private openDB() {
    const storageKey = `cevitxe::${this.databaseName}::${this.discoveryKey.substr(0, 12)}`
    return idb.openDB(storageKey, DB_VERSION, {
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

  /**
   * Creates a new repo with the given initial state
   * @param initialState
   */
  private async create() {
    for (let documentId in this.state) {
      const document = A.from(this.state[documentId])
      await this.set(documentId, document)
    }
  }

  /**
   * Loads all the repo's snapshots into memory
   */
  private async rebuildSnapshotsFromHistory() {
    const database = await this.openDB()
    const snapshots = await database.getAll('snapshots')
    for (const { documentId, snapshot } of snapshots) {
      if (snapshot[DELETED]) {
        // omit deleted documents
      } else {
        this.state[documentId] = snapshot
      }
    }
    database.close()
  }

  /**
   * Adds a set of changes to the document's append-only history.
   * @param changeSet
   */
  private async appendChangeset(changeSet: ChangeSet) {
    this.log('appending changeset', changeSet.documentId, changeSet.changes.length)
    const database = await this.openDB()
    await database.add('feeds', changeSet)
    database.close()
  }

  /**
   * Gets all stored changesets from a document's history.
   * @param documentId The ID of the requested document.
   * @returns An array of changesets in order of application.
   */
  private async getChangesets(documentId: string): Promise<ChangeSet[]> {
    const database = await this.openDB()
    const changeSets = await database.getAllFromIndex('feeds', 'documentId', documentId)
    this.log('getChangeSets', documentId, changeSets.length)
    database.close()
    return changeSets
  }
}
