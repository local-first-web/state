import A from 'automerge'
import debug from 'debug'
import { EventEmitter } from 'events'
import * as idb from 'idb/with-async-ittr'
import { DocSet } from './DocSet'
import { ChangeSet, DocSetState } from './types'

const DB_VERSION = 1

/**
 *
 * ### Storage schema
 *
 * We use a single database with two object stores: `feeds`, containing changesets in sequential
 * order, indexed by documentId; and `snapshots`, containing an actual
 *
 * One repo = one discovery key = one db
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
export class Repo extends EventEmitter {
  private discoveryKey: string
  private databaseName: string
  // private feed: Feed<string>

  public docSet: DocSet<any> = new DocSet()
  private log: debug.Debugger

  constructor(discoveryKey: string, databaseName: string) {
    super()
    this.discoveryKey = discoveryKey
    this.databaseName = databaseName
    this.log = debug(`cevitxe:repo:${this.databaseName}`)
    // TODO: reimplement encryption at rest?
    // const { key: publicKey, secretKey } = getKeys(this.databaseName, this.discoveryKey)
  }

  openDb = () => {
    const storageKey = `cevitxe::${this.databaseName}::${this.discoveryKey.substr(0, 12)}`
    return idb.openDB(storageKey, DB_VERSION, {
      upgrade(db) {
        // feeds
        const feeds = db.createObjectStore('feeds', {
          keyPath: 'id',
          autoIncrement: true,
        })
        feeds.createIndex('documentFeed', ['documentId', 'id'])
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

  async appendChangeset(changeSet: ChangeSet) {
    const database = await this.openDb()
    await database.add('feeds', changeSet)
    database.close()
  }

  async getChangesets(documentId: string): Promise<ChangeSet[]> {
    const database = await this.openDb()
    const items = await database.getAllFromIndex(
      'feeds',
      'documentFeed',
      IDBKeyRange.bound([documentId], [documentId, []])
    )
    database.close()
    return items
  }

  async hasData() {
    const database = await this.openDb()
    const count = await database.count('feeds')
    return count > 0
  }

  init = async (
    initialState: any,
    creating: boolean,
    docSet: DocSet<any>
  ): Promise<DocSetState> => {
    const hasData = await this.hasData()
    this.log('hasData', hasData)
    this.docSet = docSet
    let state: DocSetState
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

  append = async (changeSet: ChangeSet) => {
    await this.appendChangeset(changeSet)
  }

  async saveSnapshot(documentId: string, snapshot: any) {
    this.log('saveSnapshot', documentId, snapshot)
    const database = await this.openDb()
    await database.put('snapshots', { documentId, snapshot })
    database.close()
    this.log('end saveSnapshot')
  }

  async getSnapshot(documentId: string) {
    const database = await this.openDb()

    const { snapshot } = await database.get('snapshots', documentId)

    this.log('getSnapshot', documentId, snapshot)
    database.close()
    return snapshot
  }

  async removeSnapshot(documentId: string) {
    const database = await this.openDb()
    this.log('deleting', documentId)
    await database.delete('snapshots', documentId)
    database.close()
  }

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

  async getDocumentIds(objectStore: string) {
    this.log('getDocumentIds', objectStore)
    const database = await this.openDb()
    const documentIds = await database.getAllKeysFromIndex(objectStore, 'documentId')
    this.log('documentIds', documentIds)
    return documentIds.map(documentId => documentId.toString())
  }

  private async create(initialState: any) {
    this.log('creating new store %o', initialState)
    for (let documentId in initialState) {
      const document = A.from(initialState[documentId])
      this.docSet.setDoc(documentId, document)
      const changes = A.getChanges(A.init(), document)
      await this.append({ documentId, changes })
      await this.saveSnapshot(documentId, initialState[documentId])
    }
  }

  private async getStateFromStorage() {
    //const documentIds = await this.getDocumentIds('feeds')
    const database = await this.openDb()
    const index = database.transaction('feeds').store.index('documentId')
    this.log('index', index)
    for await (const cursor of index.iterate(undefined, 'nextunique')) {
      this.log(cursor)
    }
    // this.log('getting changesets from storage', documentIds)
    // for (const documentId of documentIds) {
    //   this.log('documentId', documentId)
    //   const changeSets = await this.getChangesets(documentId)
    //   for (const { isDelete, documentId, changes } of changeSets) {
    //     this.log('applying changeset', { isDelete, documentId, changes })
    //     if (isDelete) {
    //       this.log('delete', documentId)
    //       await this.removeSnapshot(documentId)
    //       this.docSet.removeDoc(documentId)
    //     } else this.docSet.applyChanges(documentId, changes)
    //   }
    // }
    this.log('done rehydrating')
  }
}
