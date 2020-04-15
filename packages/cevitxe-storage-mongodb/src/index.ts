import { StorageAdapter } from 'cevitxe-storage-abstract'
import { ChangeSet, SnapshotRecord } from 'cevitxe-types'
import { MongoClient, Db, Collection } from 'mongodb'

export class MongoAdapter extends StorageAdapter {
  private client?: MongoClient
  private database: Db

  private changesCollection?: Collection<ChangeSet>
  private snapshotsCollection?: Collection<SnapshotRecord>

  constructor(options: { discoveryKey: string; databaseName: string }) {
    super(options)
  }

  async open() {
    const url = process.env.MONGO_URL || 'mongodb://localhost:27017'

    // Create a new MongoClient
    this.client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    // Use connect method to connect to the Server
    await this.client.connect()
    this.database = this.client.db(this.storageKey)

    this.database.collection<ChangeSet>('changes').createIndex({ documentId: 1 }, { unique: true })
    this.database
      .collection<SnapshotRecord>('snapshots')
      .createIndex({ documentId: 1 }, { unique: true })
    this.changesCollection = this.database.collection<ChangeSet>('changes')
    this.snapshotsCollection = this.database.collection<SnapshotRecord>('snapshots')
  }

  async close() {
    if (this.client) {
      await this.client.close()
      delete this.client
      delete this.database
    }
  }

  async *snapshots() {
    this.ensureOpen()
    for await (const snapshotRecord of this.snapshotsCollection.find({})) yield snapshotRecord
  }

  async *changes() {
    this.ensureOpen()
    for await (const changeSet of this.changesCollection.find({})) yield changeSet
  }

  async hasData() {
    this.ensureOpen()
    const count = await this.changesCollection!.countDocuments()
    return count > 0
  }

  async getChanges(documentId: string): Promise<ChangeSet[]> {
    this.ensureOpen()
    return this.changesCollection!.find({ documentId }).toArray()
  }

  async appendChanges(changeSet: ChangeSet) {
    this.ensureOpen()
    await this.changesCollection!.insertOne(changeSet)
  }

  async putSnapshot({ documentId, snapshot, clock }: SnapshotRecord) {
    this.ensureOpen()
    await this.snapshotsCollection.updateOne(
      { documentId },
      { $set: { documentId, snapshot, clock } }
    )
  }

  async deleteSnapshot(documentId: string) {
    this.ensureOpen()
    await this.snapshotsCollection.deleteOne({ documentId })
  }

  private ensureOpen() {
    if (!this.database)
      throw new Error('The database has not been opened yet. Have you called `repo.open()`?')
  }
}
