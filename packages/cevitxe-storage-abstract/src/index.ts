import { ChangeSet, SnapshotRecord } from 'cevitxe-types'

export abstract class StorageAdapter {
  storageKey: string

  constructor(options: { discoveryKey: string; databaseName: string }) {
    const { databaseName, discoveryKey } = options
    this.storageKey = `cevitxe_${databaseName}_${discoveryKey.substr(0, 12)}`
  }

  abstract open(): Promise<void>
  abstract close(): Promise<void>
  abstract hasData(): Promise<boolean>

  abstract changes(): AsyncIterableIterator<ChangeSet>
  abstract getChanges(documentId: string): Promise<ChangeSet[]>
  abstract appendChanges(changeSet: ChangeSet): Promise<void>

  abstract snapshots(): AsyncIterableIterator<SnapshotRecord>
  abstract putSnapshot(snapshotRecord: SnapshotRecord): Promise<void>
  abstract deleteSnapshot(snapshotId: string): Promise<void>
}
