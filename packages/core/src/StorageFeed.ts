import A from 'automerge'
import debug from 'debug'
import { EventEmitter } from 'events'
import hypercore from 'hypercore'
import db from 'random-access-idb'
import { getKeys } from './keys'
import { ChangeSet, DocSetState } from './types'
import { get, set } from 'idb-keyval'

let log = debug('cevitxe:storagefeed')

export class StorageFeed extends EventEmitter {
  storageKey = (type: string) =>
    `cevitxe::${type}::${this.databaseName}::${this.discoveryKey.substr(0, 12)}`

  private discoveryKey: string
  private databaseName: string
  private feed: Feed<string>

  public docSet: A.DocSet<any> = new A.DocSet()

  constructor(discoveryKey: string, databaseName: string) {
    super()
    this.discoveryKey = discoveryKey
    this.databaseName = databaseName

    log('creating storage feed')
    const { key: publicKey, secretKey } = getKeys(this.databaseName, this.discoveryKey)
    const storage = db(this.storageKey('feed'))

    this.feed = hypercore(storage, publicKey, { secretKey, valueEncoding: 'utf-8' })
    this.feed.on('error', (err: any) => console.error(err))
  }

  init = (initialState: any, creating: boolean, docSet: A.DocSet<any>): Promise<DocSetState> =>
    new Promise(resolve =>
      this.feed.on('ready', async () => {
        this.docSet = docSet
        let state: DocSetState
        if (creating) {
          log('creating a new document')
          state = initialState
          this.create(state)
        } else if (this.feed.length === 0) {
          log(`joining a peer's document for the first time`)
          state = {}
          this.create(state)
        } else {
          state = await this.getSnapshot()
          log('recovering an existing document from persisted state')
          this.getStateFromStorage() // done asynchronously
        }
        log('ready')
        this.emit('ready')
        resolve(state)
      })
    )

  ready = async () => new Promise(ok => this.feed.on('ready', ok))

  close = (cb: (err: Error) => void) =>
    this.feed.close(err => {
      cb(err)
      this.emit('close')
    })

  append = (data: string) => this.feed.append(data)

  saveSnapshot = async (state: DocSetState) => {
    log('saving snapshot')
    const snapshot = JSON.stringify(state)
    log('snapshot size: %o KB', Math.floor(snapshot.length / 1024))
    set(this.storageKey('snapshot'), snapshot)
    log('saved snapshot')
  }

  getSnapshot = async () => {
    const snapshot: string = await get(this.storageKey('snapshot'))
    if (snapshot && snapshot.length) {
      log('getting snapshot')
      return JSON.parse(snapshot)
    } else {
      log('no snapshot found')
      return undefined
    }
  }

  private create(initialState: any) {
    log('creating new store %o', initialState)
    for (let docId in initialState) {
      const doc = A.from(initialState[docId])
      this.docSet.setDoc(docId, doc)
      const changes = A.getChanges(A.init(), doc)
      this.feed.append(JSON.stringify({ docId, changes }))
    }
  }

  private async readAll() {
    return new Promise<string[]>(ok =>
      this.feed.getBatch(0, this.feed.length, (_, data) => ok(data))
    )
  }

  private async getStateFromStorage() {
    log('getting changesets from storage')

    const feedContents = await this.readAll()

    log('parsing changesets', feedContents.length)
    const changeSets = feedContents.map(s => JSON.parse(s) as ChangeSet)

    log('rehydrating from stored change sets')
    changeSets.forEach(({ docId, changes, isDelete }) => {
      if (isDelete) this.docSet.removeDoc(docId)
      else this.docSet.applyChanges(docId, changes)
    })

    log('done rehydrating')
  }
}
