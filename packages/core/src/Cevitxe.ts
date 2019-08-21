import A from 'automerge'
import { DocSet } from './lib/automerge'
import { Client, newid, Peer } from 'cevitxe-signal-client'
import debug from 'debug'
import { EventEmitter } from 'events'
import hypercore from 'hypercore'
import db from 'random-access-idb'
import * as Redux from 'redux'
import { Middleware, Store } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import { adaptReducer } from './adaptReducer'
import { Connection } from './Connection'
import { DEFAULT_SIGNAL_SERVERS } from './constants'
import { getMiddleware } from './getMiddleware'
import { getKeys, getKnownDiscoveryKeys } from './keys'
import { CevitxeOptions, ProxyReducer } from './types'
import { docSetFromObject, docSetToObject } from './docSetHelpers'

const valueEncoding = 'utf-8'

let log = debug('cevitxe')

// It's normal for a document with a lot of participants to have a lot of connections, so increase
// the limit to avoid spurious warnings about emitter leaks.
EventEmitter.defaultMaxListeners = 500

export class Cevitxe<T> extends EventEmitter {
  private proxyReducer: ProxyReducer
  private initialState: T
  private urls: string[]
  private middlewares: Middleware[] // TODO: accept an `enhancer` object instead

  private id = newid()
  private feed?: Feed<string>

  public connections: { [peerId: string]: Connection }
  public databaseName: string
  public store?: Store
  public discoveryKey?: string = undefined

  constructor({
    databaseName,
    proxyReducer,
    initialState,
    urls = DEFAULT_SIGNAL_SERVERS,
    middlewares = [],
  }: CevitxeOptions<T>) {
    super()
    this.proxyReducer = proxyReducer
    this.middlewares = middlewares
    this.initialState = initialState
    this.databaseName = databaseName
    this.urls = urls
    this.connections = {}
  }

  joinStore = (discoveryKey: string) => this.makeStore(discoveryKey, false)

  createStore = (discoveryKey: string) => this.makeStore(discoveryKey, true)

  private makeStore = async (discoveryKey: string, creating: boolean = false) => {
    log = debug(`cevitxe:${creating ? 'createStore' : 'joinStore'}:${discoveryKey}`)
    this.discoveryKey = discoveryKey

    this.feed = await createStorageFeed(discoveryKey, this.databaseName)

    const docSet: DocSet<any> = creating
      ? setInitialState(this.feed, this.initialState) // ceating a new document, starting with default state
      : this.feed.length > 0
      ? await getStateFromStorage(this.feed) // rehydrating state from storage
      : setInitialState(this.feed, {}) // joining a peer's feed, starting with an empty doc

    const state = docSetToObject(docSet)

    docSet.registerHandler((key, doc) => {
      log('change', key)
      // hook for testing
      this.emit('change', key, doc)
    })
    log('created initial docSet', state)

    // Create Redux store
    const reducer = adaptReducer(this.proxyReducer, docSet)
    const cevitxeMiddleware = getMiddleware(this.feed, docSet, this.proxyReducer, this.discoveryKey)
    const enhancer = composeWithDevTools(
      Redux.applyMiddleware(...this.middlewares, cevitxeMiddleware)
    )
    this.store = Redux.createStore(reducer, state, enhancer)

    // TODO: randomly select a URL if more than one is provided? select best based on ping?
    const url = this.urls[0]
    const client = new Client({ id: this.id, url })

    client.join(discoveryKey)

    // For each peer that wants to connect, create a Connection object
    client.on('peer', async (peer: Peer) => {
      if (this.store === undefined) return

      log('connecting to peer', peer.id)

      peer.on('close', () => this.removePeer(peer.id))

      const socket = peer.get(discoveryKey)
      const connection = new Connection(docSet, socket, this.store.dispatch)
      this.connections[peer.id] = connection
      log('connected to peer', peer.id)

      this.emit('peer', peer) // hook for testing
    })

    this.emit('ready', this.store)
    return this.store
  }

  public get connectionCount() {
    return Object.keys(this.connections).length
  }

  get knownDiscoveryKeys() {
    return getKnownDiscoveryKeys(this.databaseName)
  }

  removePeer = (peerId: string) => {
    log('removing peer', peerId)
    if (this.connections[peerId]) this.connections[peerId].close()
    delete this.connections[peerId]
  }

  close = async () => {
    this.store = undefined
    this.removeAllListeners()

    const closeAllConnections = Object.keys(this.connections).map(peerId => this.removePeer(peerId))
    await Promise.all(closeAllConnections)
    this.connections = {}

    const feed = this.feed
    if (feed) {
      await Promise.all([
        new Promise(ok => feed.close(ok)),
        new Promise(ok => feed.on('close', ok)),
      ])
      this.feed = undefined
    }
    this.emit('close')
  }
}

const getStateFromStorage = async (feed: Feed<string>): Promise<DocSet<any>> => {
  log('getting change sets from storage')

  // read full contents of the feed in one batch
  const feedContents = new Promise(yes => feed.getBatch(0, feed.length, (_, data) => yes(data)))
  const data = (await feedContents) as string[]
  const feedEntries = data.map(changes => JSON.parse(changes))

  log('rehydrating from stored change sets %o', feedEntries)
  let docSet = new DocSet()
  feedEntries.forEach(entry => {
    entry.forEach((changeSet: any) => {
      if (changeSet.isDelete) {
        docSet.removeDoc(changeSet.docId)
      } else {
        docSet.applyChanges(changeSet.docId, changeSet.changes)
      }
    })
  })

  log('done rehydrating')
  return docSet
}

const setInitialState = <T>(feed: Feed<string>, initialState: T) => {
  log('nothing in storage; initializing %o', initialState)

  const docSet = docSetFromObject(initialState)
  let changes = []
  // @ts-ignore
  for (let docId of docSet.docIds) {
    const nextDoc = docSet.getDoc(docId)
    changes.push({
      docId,
      changes: A.getChanges(A.init(), nextDoc),
    })
  }
  feed.append(JSON.stringify(changes))
  return docSet
}

const createStorageFeed = async (discoveryKey: string, databaseName: string) => {
  log('creating storage feed')
  const { key, secretKey } = getKeys(databaseName, discoveryKey)
  const storage = db(`cevitxe-${databaseName}-${discoveryKey.substr(0, 12)}`)

  const feed: Feed<string> = hypercore(storage, key, { secretKey, valueEncoding })
  feed.on('error', (err: any) => console.error(err))
  await new Promise(ok => feed.on('ready', ok))
  log('feed ready')
  return feed
}
