import A from 'automerge'
import debug from 'debug'
import { EventEmitter } from 'events'
import hypercore from 'hypercore'
import db from 'random-access-idb'
import { getKeys } from './keys'
import { ChangeSet } from './types'

let log = debug('cevitxe:storagefeed')

export class StorageFeed extends EventEmitter {
  private discoveryKey: string
  private databaseName: string
  private feed: Feed<string>

  public docSet: A.DocSet<any> = new A.DocSet()

  constructor(discoveryKey: string, databaseName: string) {
    super()
    this.discoveryKey = discoveryKey
    this.databaseName = databaseName

    log('creating storage feed')
    const { key, secretKey } = getKeys(this.databaseName, this.discoveryKey)
    const storage = db(`cevitxe-${this.databaseName}-${this.discoveryKey.substr(0, 12)}`)

    this.feed = hypercore(storage, key, { secretKey, valueEncoding: 'utf-8' })
    this.feed.on('error', (err: any) => console.error(err))
  }

  init = (initialState: any, creating: boolean): Promise<A.DocSet<any>> =>
    new Promise(resolve =>
      this.feed.on('ready', async () => {
        if (creating) {
          log('creating a new document')
          this.create(initialState)
        } else if (this.feed.length === 0) {
          log(`joining a peer's document for the first time`)
          this.create({})
        } else {
          log('recovering an existing document from persisted state')
          await this.getStateFromStorage()
        }
        log('ready')
        this.emit('ready')
        resolve(this.docSet)
      })
    )

  ready = async () => new Promise(ok => this.feed.on('ready', ok))

  close = (cb: (err: Error) => void) =>
    this.feed.close(err => {
      cb(err)
      this.emit('close')
    })

  append = (data: string) => this.feed.append(data)

  private create(initialState: any) {
    log('creating new store %o', initialState)
    const changeSets: ChangeSet[] = []
    for (let docId in initialState) {
      const doc = A.from(initialState[docId])
      this.docSet.setDoc(docId, doc)
      const changes = A.getChanges(A.init(), doc)
      changeSets.push({ docId, changes })
    }
    this.feed.append(JSON.stringify(changeSets))
  }

  private async readAll() {
    return new Promise<string[]>(ok =>
      this.feed.getBatch(0, this.feed.length, (_, data) => ok(data))
    )
  }

  private async getStateFromStorage() {
    log('getting change sets from storage')

    // read full contents of the feed in one batch
    const feedContents = await this.readAll()

    // each feed entry is the result of a single redux action, and contains one or more ChangeSets
    const feedEntries: ChangeSet[][] = feedContents.map(s => JSON.parse(s))

    log('rehydrating from stored change sets %o', feedEntries)
    feedEntries.forEach(entry => {
      entry.forEach(({ docId, changes, isDelete }) => {
        if (isDelete) this.docSet.removeDoc(docId)
        else this.docSet.applyChanges(docId, changes)
      })
    })

    log('done rehydrating')
  }
}
