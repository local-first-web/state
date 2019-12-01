import { ChangeSet, SnapshotRecord } from 'cevitxe-types'

export abstract class StorageAdapter {
  storageKey: string
  collections: string[]

  constructor(options: { discoveryKey: string; databaseName: string; collections?: string[] }) {
    const { databaseName, discoveryKey, collections = [] } = options
    this.storageKey = `cevitxe_${databaseName}_${discoveryKey.substr(0, 12)}`
    this.collections = collections
  }

  abstract async open(): Promise<void>
  abstract async close(): Promise<void>
  abstract async hasData(): Promise<boolean>

  abstract changes(collection?: string): AsyncIterableIterator<ChangeSet>
  abstract async getChanges(documentId: string): Promise<ChangeSet[]>
  abstract async appendChanges(changeSet: ChangeSet): Promise<void>

  abstract snapshots(collection?: string): AsyncIterableIterator<SnapshotRecord>
  abstract async putSnapshot(snapshotRecord: SnapshotRecord): Promise<void>
  abstract async deleteSnapshot(snapshotId: string): Promise<void>
}
