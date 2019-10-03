import A from 'automerge'
import debug from 'debug'
import { EventEmitter } from 'events'
// import hypercore from 'hypercore'
// import db from 'random-access-idb'
// import { getKeys } from './keys'
import { ChangeSet, DocSetState } from './types'

import * as idb from 'idb'

let log = debug('cevitxe:storagefeed')

/*

### Storage schema 

We use a single database with two object stores

One repo = one discovery key = one db

```
cevitxe::grid::fancy-lizard (DB)
  feeds (object store)
    1: { id:1, documentId: abc123, changeSet: [...]}
    2: { id:2, documentId: abc123, changeSet: [...]}
    3: { id:3, documentId: abc123, changeSet: [...]}
    4: { id:4, documentId: qrs567, changeSet: [...]}
    5: { id:5, documentId: qrs567, changeSet: [...]}
    6: { id:6, documentId: qrs567, changeSet: [...]}
  snapshots (object store)
    abc123: [snapshot]
    qrs567: [snapshot]
```
*/

const DB_VERSION = 3

export class Repo extends EventEmitter {
  private discoveryKey: string
  private databaseName: string
  // private feed: Feed<string>

  public docSet: A.DocSet<any> = new A.DocSet()

  constructor(discoveryKey: string, databaseName: string) {
    super()
    this.discoveryKey = discoveryKey
    this.databaseName = databaseName

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

  async getChangesets(documentId: string) {
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
    docSet: A.DocSet<any>
  ): Promise<DocSetState> => {
    const hasData = await this.hasData()
    log('hasData', hasData)
    this.docSet = docSet
    let state: DocSetState
    if (creating) {
      //
      log('creating a new document')
      state = initialState
      this.create(state)
    } else if (!hasData) {
      //
      log(`joining a peer's document for the first time`)
      state = {}
      this.create(state)
    } else {
      state = await this.getFullSnapshot()
      log('recovering an existing document from persisted state')
      this.getStateFromStorage() // done asynchronously
    }
    log('ready')
    this.emit('ready')
    return state
  }

  append = async (changeSet: ChangeSet) => {
    await this.appendChangeset(changeSet)
  }

  async saveSnapshot(documentId: string, snapshot: any) {
    log('saveSnapshot', documentId, snapshot)
    const database = await this.openDb()
    await database.put('snapshots', { documentId, snapshot })
    database.close()
    log('end saveSnapshot')
  }

  async getSnapshot(documentId: string) {
    const database = await this.openDb()

    const { snapshot } = await database.get('snapshots', documentId)

    log('getSnapshot', documentId, snapshot)
    database.close()
    return snapshot
  }

  async getFullSnapshot() {
    const documentIds = await this.getDocumentIds('snapshots')
    const state = {} as any
    let documentId: string
    for (documentId of documentIds) {
      state[documentId] = await this.getSnapshot(documentId)
    }
    log('getFullSnapshot', state)
    return state
  }

  async getDocumentIds(objectStore: string) {
    log('getDocumentIds', objectStore)
    const database = await this.openDb()
    const documentIds = await database.getAllKeysFromIndex(objectStore, 'documentId')
    log('documentIds', documentIds)
    return documentIds.map(docId => docId.toString())
  }

  private create(initialState: any) {
    log('creating new store %o', initialState)
    // TODO: Use either docId or documentId consistently, but not both interchangeably
    for (let docId in initialState) {
      const doc = A.from(initialState[docId])
      this.docSet.setDoc(docId, doc)
      const changes = A.getChanges(A.init(), doc)
      this.append({ docId, changes })
      this.saveSnapshot(docId, initialState)
    }
  }

  private async getStateFromStorage() {
    log('getting changesets from storage')
    const database = await this.openDb()
    const documentIds = await this.getDocumentIds('feeds')

    database.close()
    for (const documentId in documentIds) {
      const changeSets = await this.getChangesets(documentId)
      changeSets.forEach(({ docId, changes, isDelete }) => {
        if (isDelete) this.docSet.removeDoc(docId)
        else this.docSet.applyChanges(docId, changes)
      })
    }
    log('done rehydrating')
  }
}
