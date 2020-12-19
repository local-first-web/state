import { StorageAdapter } from 'storage-abstract'
import { ChangeSet, SnapshotRecord } from 'types'
import { IDBPDatabase, openDB, DBSchema } from 'idb/with-async-ittr-cjs'
import debug from 'debug'

/**
 * We use a single database with two object stores: `changes`, containing changesets in sequential
 * order, indexed by documentId; and `snapshots`, containing the document's current state as a plain
 * JavaScript object.
 *
 * There is one repo (and one database) per discovery key.
 *
 * ```
 * cevitxe_grid_fancy-lizard (DB)
 *   changes (object store)
 *     1: { id:1, documentId: abc123, changeSet: [...]}
 *     2: { id:2, documentId: abc123, changeSet: [...]}
 *     3: { id:3, documentId: abc123, changeSet: [...]}
 *     4: { id:4, documentId: qrs567, changeSet: [...]}
 *     5: { id:5, documentId: qrs567, changeSet: [...]}
 *     6: { id:6, documentId: qrs567, changeSet: [...]}
 *   snapshots (object store)
 *     abc123: { documentId: abc123, snapshot: {...}, clock: {...}}
 *     qrs567: { documentId: qrs567, snapshot: {...}, clock: {...}}
 * ```
 */
export class IdbAdapter extends StorageAdapter {
  private database?: IDBPDatabase<RepoSchema>
  private log: debug.Debugger

  constructor(options: { discoveryKey: string; databaseName: string }) {
    super(options)
    this.log = debug(`lf:idbadapter:${this.storageKey}`)
  }

  async open() {
    this.database = await openDB<RepoSchema>(this.storageKey, DB_VERSION, {
      upgrade(db) {
        // changes
        const changes = db.createObjectStore('changes', {
          keyPath: 'id',
          autoIncrement: true,
        })
        changes.createIndex('by-documentId', 'documentId')

        // snapshots
        const snapshots = db.createObjectStore('snapshots', {
          keyPath: 'documentId',
          autoIncrement: false,
        })
        snapshots.createIndex('by-documentId', 'documentId')
        // TODO: use unique index?
      },
    })
    this.log('opened', this.database.name)
  }

  async close() {
    if (this.database) {
      this.database.close()
      delete this.database
      this.log('closed')
    }
  }

  async *snapshots() {
    this.ensureOpen()
    const index = this.database!.transaction('snapshots').store.index('by-documentId')
    for await (const cursor of index.iterate(undefined, 'next')) yield cursor.value
  }

  async *changes() {
    this.ensureOpen()
    const index = this.database!.transaction('changes').store.index('by-documentId')
    for await (const cursor of index.iterate(undefined, 'next')) yield cursor.value
  }

  async hasData() {
    this.ensureOpen()
    const count = await this.database!.count('changes')
    return count > 0
  }

  async getChanges(documentId: string): Promise<ChangeSet[]> {
    this.ensureOpen()
    return this.database!.getAllFromIndex('changes', 'by-documentId', documentId)
  }

  async appendChanges(changeSet: ChangeSet) {
    this.ensureOpen()
    await this.database!.add('changes', changeSet)
  }

  async putSnapshot({ documentId, snapshot, clock }: SnapshotRecord) {
    this.ensureOpen()
    await this.database!.put('snapshots', { documentId, snapshot, clock })
  }

  async deleteSnapshot(documentId: string) {
    this.ensureOpen()
    await this.database!.delete('snapshots', documentId)
  }

  private ensureOpen() {
    if (!this.database)
      throw new Error('The database has not been opened yet. Have you called `repo.open()`?')
  }
}

const DB_VERSION = 1

interface RepoSchema extends DBSchema {
  changes: {
    key: number
    value: ChangeSet
    indexes: { 'by-documentId': string }
  }
  snapshots: {
    key: string
    value: SnapshotRecord
    indexes: { 'by-documentId': string }
  }
}
