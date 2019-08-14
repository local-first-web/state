import A, { Doc } from 'automerge'
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
import { getKeys, getKnowndiscoveryKeys } from './keys'
import { CevitxeOptions, ProxyReducer } from './types'
import { docSetFromObject } from './docSetHelpers'

const valueEncoding = 'utf-8'

let log = debug('cevitxe')

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

    const state: any = creating
      ? setInitialState(this.feed, this.initialState) // ceating a new document, starting with default state
      : this.feed.length > 0
      ? await getStateFromStorage(this.feed) // rehydrating state from storage
      : setInitialState(this.feed, {}) // joining a peer's feed, starting with an empty doc

    const docSet = docSetFromObject(state)

    docSet.registerHandler((key, doc) => {
      log('change', key)
      // hook for testing
      this.emit('change', key, doc)
    })
    log('created initial docSet', state)

    // Create Redux store
    const reducer = adaptReducer(this.proxyReducer, docSet)
    const cevitxeMiddleware = getMiddleware(this.feed, docSet, this.discoveryKey)
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

  get knowndiscoveryKeys() {
    return getKnowndiscoveryKeys(this.databaseName)
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

const getStateFromStorage = async <T>(feed: Feed<string>): Promise<Doc<T>> => {
  log('getting change sets from storage')

  // read full contents of the feed in one batch
  const feedContents = new Promise(yes => feed.getBatch(0, feed.length, (_, data) => yes(data)))
  const data = (await feedContents) as string[]
  const changeSets = data.map(changes => JSON.parse(changes))

  log('rehydrating from stored change sets %o', changeSets)
  let state = A.init<T>()
  changeSets.forEach(changes => (state = A.applyChanges(state, changes)))

  log('done rehydrating')
  return state
}

const setInitialState = <T>(feed: Feed<string>, initialState: T) => {
  log('nothing in storage; initializing %o', initialState)

  const state = A.from(initialState)

  // send initialization changes to the feed for persistence
  const changeSet = A.getChanges(A.init(), state)
  feed.append(JSON.stringify(changeSet))

  return state
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
