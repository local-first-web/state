import A from 'automerge'
import debug from 'debug'
import { EventEmitter } from 'events'
import hypercore from 'hypercore'
import db from 'random-access-idb'
import * as Redux from 'redux'
import { Middleware, Store } from 'redux'

import { Client, Peer } from 'cevitxe-signal-client'
import { adaptReducer } from './adaptReducer'
import { Connection } from './Connection'
import { DEFAULT_PEER_HUBS } from './constants'
import { getMiddleware } from './getMiddleware'
import { promisify } from './lib/promisify'
import { getKeys, getKnownDocumentIds } from './keys'
import { CevitxeOptions, ProxyReducer } from './types'

const valueEncoding = 'utf-8'

let log = debug('cevitxe')

export class Cevitxe<T> extends EventEmitter {
  private proxyReducer: ProxyReducer<any>
  private middlewares: Middleware[] // TODO: accept an `enhancer` object instead
  private initialState: T

  private onReceive?: Function

  databaseName: string
  store?: Store

  private urls: string[]

  private feed?: Feed<string>
  private hub?: any
  private connections: Connection[]

  constructor({
    databaseName,
    proxyReducer,
    initialState,
    urls: peerHubs = DEFAULT_PEER_HUBS,
    middlewares = [],
    onReceive,
  }: CevitxeOptions<T>) {
    super()
    this.proxyReducer = proxyReducer
    this.middlewares = middlewares
    this.initialState = initialState
    this.onReceive = onReceive
    this.databaseName = databaseName
    this.urls = peerHubs
    this.connections = []
  }

  joinStore = (documentId: string) => this.makeStore(documentId, false)

  createStore = (documentId: string) => this.makeStore(documentId, true)

  private makeStore = async (documentId: string, creating: boolean = false) => {
    log = debug(`cevitxe:${creating ? 'createStore' : 'joinStore'}:${documentId}`)

    this.feed = await createStorageFeed(documentId, this.databaseName)

    const state = creating
      ? setInitialState(this.feed, this.initialState) // ceating a new document, starting with default state
      : this.feed.length > 0
      ? await getStateFromStorage(this.feed) // rehydrating state from storage
      : setInitialState(this.feed, {}) // joining a peer's feed, starting with an empty doc

    const watchableDoc = new A.WatchableDoc(state)
    log('created initial watchableDoc', state)

    // Create Redux store
    const reducer = adaptReducer(this.proxyReducer)
    const cevitxeMiddleware = getMiddleware(this.feed, watchableDoc)
    const enhancer = Redux.applyMiddleware(...this.middlewares, cevitxeMiddleware)
    this.store = Redux.createStore(reducer, state, enhancer)

    // TODO: randomly select a URL?
    const url = this.urls[0]
    const client = new Client({ url })

    client.join(documentId)

    // For each peer that wants to connect, create a Connection object
    client.on('peer', (peer: Peer) => {
      log('connecting to peer', peer.id)
      const socket = peer.get(documentId)
      const connection = new Connection(watchableDoc, socket, this.store!.dispatch, this.onReceive)
      this.connections.push(connection)
    })

    return this.store
  }

  public get connectionCount() {
    return this.connections.length
  }

  get knownDocumentIds() {
    return getKnownDocumentIds(this.databaseName)
  }

  close = async () => {
    this.store = undefined
    if (this.connections) await this.connections.forEach(async c => await c.close())
    if (this.feed) await promisify(this.feed.close)
    // if (this.hub) await promisify(this.hub.close)
    this.feed = undefined
    this.hub = undefined
    this.connections = []
  }
}

const getStateFromStorage = async (feed: Feed<string>) => {
  log('getting change sets from storage')
  const batch = new Promise(yes => feed.getBatch(0, feed.length, (_, data) => yes(data)))
  const data = (await batch) as string[]
  const changeSets = data.map(d => JSON.parse(d))
  log('rehydrating from stored change sets', changeSets)
  let state = A.init()
  changeSets.forEach(changes => (state = A.applyChanges(state, changes)))
  log('done rehydrating')
  return state
}

const setInitialState = <T>(feed: Feed<string>, initialState: T) => {
  log('nothing in storage; initializing', JSON.stringify(initialState))
  const state = A.from(initialState)
  const changeSet = A.getChanges(A.init(), state)
  feed.append(JSON.stringify(changeSet))
  log('initialized')
  return state
}

const createStorageFeed = async (documentId: string, databaseName: string) => {
  log('creating storage feed')
  const { key, secretKey } = getKeys(databaseName, documentId)
  const dbName = getDbName(databaseName, documentId)
  const storage = db(dbName)

  const feed: Feed<string> = hypercore(storage, key, { secretKey, valueEncoding })
  feed.on('error', (err: any) => console.error(err))
  const feedReady = new Promise(ok => feed.on('ready', ok))
  await feedReady
  log('feed ready')
  return feed
}

export const getDbName = (databaseName: string, documentId: string) =>
  `cevitxe-${databaseName}-${documentId.substr(0, 12)}`
