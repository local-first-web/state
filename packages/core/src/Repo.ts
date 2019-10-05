import A from 'automerge'
import debug from 'debug'
import { EventEmitter } from 'events'
import * as idb from 'idb/with-async-ittr-cjs'
import { ChangeSet, RepoSnapshot } from './types'

const DB_VERSION = 1
export type RepoEventHandler<T> = (documentId: string, doc: A.Doc<T>) => void

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
  private discoveryKey: string
  private databaseName: string

  private log: debug.Debugger

  // DocSet
  private docs: Map<string, A.Doc<T>> // TODO: won't need this any more
  private handlers: Set<RepoEventHandler<T>>

  constructor(discoveryKey: string, databaseName: string) {
    super()
    this.discoveryKey = discoveryKey
    this.databaseName = databaseName
    this.log = debug(`cevitxe:repo:${this.databaseName}`)

    // DocSet
    this.docs = new Map()
    this.handlers = new Set()
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
    let state: RepoSnapshot
    if (creating) {
      this.log('creating a new document')
      state = initialState
      await this.create(state)
    } else if (!hasData) {
      this.log(`joining a peer's document for the first time`)
      state = {}
      await this.create(state)
    } else {
      this.log('recovering an existing document from persisted state')
      // TODO: do we need to wait on this?
      await this.getStateFromStorage()
      state = await this.getFullSnapshot()
    }
    this.emit('ready')
    return state
  }

  /**
   * Adds a set of changes to the append-only feed.
   * @param changeSet
   */
  async appendChangeset(changeSet: ChangeSet) {
    const database = await this.openDB()
    await database.add('feeds', changeSet)
    database.close()
  }

  /**
   * Gets all changesets for a given document.
   * @param documentId The ID of the requested document.
   * @returns An array of changesets in order of application.
   */
  private async getChangesets(documentId: string): Promise<ChangeSet[]> {
    const database = await this.openDB()
    const items = await database.getAllFromIndex('feeds', 'documentId', documentId)
    database.close()
    return items
  }

  /**
   * Determines whether the repo has previously persisted data or not.
   * @returns `true` if there is any stored data in the repo.
   */
  async hasData() {
    const database = await this.openDB()
    const count = await database.count('feeds')
    return count > 0
  }

  /**
   * Saves the given object as a snapshot for the given `documentId`, replacing any existing
   * snapshot.
   * @param documentId
   * @param snapshot
   */
  async saveSnapshot(documentId: string, snapshot: any) {
    this.log('saveSnapshot', documentId, snapshot)
    const database = await this.openDB()
    await database.put('snapshots', { documentId, snapshot })
    database.close()
    this.log('end saveSnapshot')
  }

  /**
   * Returns a snapshot of the document's current state.
   * @param documentId
   * @returns
   */
  async getSnapshot(documentId: string) {
    const database = await this.openDB()
    const { snapshot } = await database.get('snapshots', documentId)
    this.log('getSnapshot', documentId, snapshot)
    // TODO: if this doesn't exist, create it
    database.close()
    return snapshot
  }

  /**
   * Removes any existing snapshot for a document, e.g. when the document is marked as deleted.
   * @param documentId
   */
  async removeSnapshot(documentId: string) {
    const database = await this.openDB()
    this.log('deleting', documentId)
    await database.delete('snapshots', documentId)
    database.close()
  }

  /**
   * @returns Returns a snapshot of the repo's entire state
   */
  async getFullSnapshot() {
    const documentIds = await this.getDocumentIds('snapshots')
    const state = {} as any
    let documentId: string
    for (documentId of documentIds) {
      state[documentId] = await this.getSnapshot(documentId)
    }
    this.log('getFullSnapshot', state)
    return state
  }

  /**
   * Gets a list of the IDs of all documents recorded in the repo.
   * @param [objectStore]
   * @returns
   */
  // TODO: what is the real source of truth? should we even be exposing an alternative list?
  async getDocumentIds(objectStore: string = 'feeds') {
    this.log('getDocumentIds', objectStore)
    const documentIds: string[] = []
    const database = await this.openDB()
    const index = database.transaction(objectStore).store.index('documentId')
    for await (const cursor of index.iterate(undefined, 'nextunique'))
      documentIds.push(cursor.value.documentId)
    this.log('documentIds', documentIds)
    return documentIds.map(documentId => documentId.toString())
  }

  // Private

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
  private async create(initialState: any) {
    this.log('creating new store %o', initialState)
    for (let documentId in initialState) {
      const document = A.from(initialState[documentId])
      this.setDoc(documentId, document)
      const changes = A.getChanges(A.init(), document)
      await this.appendChangeset({ documentId, changes })
      await this.saveSnapshot(documentId, initialState[documentId])
    }
  }

  /**
   * Rehydrates the repo's state from storage
   */
  // TODO: We'll want to keep part of this that applies deletes, but since we're not loading into
  // memory any more the rest will be redundant
  private async getStateFromStorage() {
    const documentIds = await this.getDocumentIds('feeds')
    this.log('getting changesets from storage', documentIds)
    for (const documentId of documentIds) {
      const changeSets = await this.getChangesets(documentId)
      for (const { isDelete, documentId, changes } of changeSets) {
        this.log('applying changeset', { isDelete, documentId, changes })
        if (isDelete) {
          this.log('delete', documentId)
          await this.removeSnapshot(documentId)
          this.removeDoc(documentId)
        } else {
          this.applyChanges(documentId, changes)
        }
      }
    }
    this.log('done rehydrating')
  }

  // DocSet

  //-> getDocumentIDs
  get documentIds() {
    return this.docs.keys()
  }

  getDoc(documentId: string) {
    return this.docs.get(documentId)
  }

  removeDoc(documentId: string) {
    this.docs.delete(documentId)
  }

  setDoc(documentId: string, doc: A.Doc<T>) {
    this.docs = this.docs.set(documentId, doc)
    this.handlers.forEach(handler => handler(documentId, doc))
  }

  applyChanges(documentId: string, changes: A.Change[]) {
    let doc = this.docs.get(documentId) || A.init()
    doc = A.applyChanges(doc, changes)
    this.setDoc(documentId, doc)
    return doc
  }

  registerHandler(handler: RepoEventHandler<T>) {
    this.handlers.add(handler)
  }

  unregisterHandler(handler: RepoEventHandler<T>) {
    this.handlers.delete(handler)
  }
}
