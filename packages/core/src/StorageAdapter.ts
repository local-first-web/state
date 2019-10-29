﻿import { ChangeSet, SnapshotRecord } from './types'

export abstract class StorageAdapter {
  storageKey: string

  constructor(options: { discoveryKey: string; databaseName: string }) {
    const { databaseName, discoveryKey } = options
    this.storageKey = `cevitxe::${databaseName}::${discoveryKey.substr(0, 12)}`
  }

  abstract async open(): Promise<void>
  abstract async close(): Promise<void>

  abstract get snapshots(): AsyncIterableIterator<IteratorResult<SnapshotRecord, SnapshotRecord>>
  abstract get changes(): AsyncIterableIterator<IteratorResult<ChangeSet, ChangeSet>>

  abstract async hasData(): Promise<boolean>

  abstract async getChanges(documentId: string): Promise<ChangeSet[]>
  abstract async appendChanges(changeSet: ChangeSet): Promise<void>

  abstract async putSnapshot(snapshotRecord: SnapshotRecord): Promise<void>
  abstract async deleteSnapshot(snapshotId: string): Promise<void>
}
