import { StorageAdapter } from 'cevitxe-storage-abstract'
import { ChangeSet, SnapshotRecord } from 'cevitxe-types'
import * as idb from 'idb/with-async-ittr-cjs'
import { DBSchema, IDBPDatabase } from 'idb/with-async-ittr-cjs'

export class IdbAdapter extends StorageAdapter {
  private database?: IDBPDatabase<RepoSchema>

  constructor(options: { discoveryKey: string; databaseName: string }) {
    super(options)
  }

  async open() {
    this.database = await idb.openDB<RepoSchema>(this.storageKey, DB_VERSION, {
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
  }

  async close() {
    if (this.database) {
      this.database.close()
      delete this.database
    }
  }

  get snapshots() {
    this.ensureOpen()
    const index = this.database!.transaction('snapshots').store.index('by-documentId')
    return index.iterate(undefined, 'next')
  }

  get changes() {
    this.ensureOpen()
    const index = this.database!.transaction('changes').store.index('by-documentId')
    return index.iterate(undefined, 'next')
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
