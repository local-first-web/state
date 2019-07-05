import A from 'automerge'
import { EventEmitter } from 'events'
import hypercore from 'hypercore'
import db from 'random-access-idb'
import * as Redux from 'redux'
import { DeepPartial, Middleware, Store } from 'redux'
import signalhub from 'signalhub'
import { Instance as Peer } from 'simple-peer'
import webrtcSwarm from 'webrtc-swarm'
import { adaptReducer } from './adaptReducer'
import { Connection } from './connection'
import { DEFAULT_PEER_HUBS } from './constants'
import debug from './debug'
import { getMiddleware } from './getMiddleware'
import { getKeys } from './keyManager'
import { SingleDocSet } from './SingleDocSet'
import { CevitxeOptions, ProxyReducer } from './types'

const wrtc = require('wrtc')
const valueEncoding = 'utf-8'

const log = debug('cevitxe')

export class Cevitxe<T> extends EventEmitter {
  private proxyReducer: ProxyReducer<any>
  private middlewares?: Middleware[] // TODO: accept an `enhancer` object instead
  private defaultState?: Partial<T>

  private onReceive?: Function
  private databaseName?: string
  private peerHubs?: string[]

  private feed?: Feed<string>
  private hub?: any
  private swarm?: any
  private connections?: Connection[]
  private stores: { [k: string]: Store }

  constructor({
    proxyReducer,
    middlewares,
    defaultState,
    onReceive,
    databaseName,
    peerHubs,
  }: CevitxeOptions<T>) {
    super()
    this.proxyReducer = proxyReducer
    this.middlewares = middlewares
    this.defaultState = defaultState
    this.onReceive = onReceive
    this.databaseName = databaseName
    this.peerHubs = peerHubs
    this.stores = {}
  }

  createStore = async (documentId: string) => this.newStore(documentId, this.defaultState)

  joinStore = (documentId: string) => this.newStore(documentId)

  newStore = async (documentId: string, defaultState?: Partial<T>) => {
    const createStore = async <T>({
      databaseName = 'cevitxe-data',
      peerHubs = DEFAULT_PEER_HUBS,
      proxyReducer,
      defaultState = {},
      middlewares = [],
      documentId,
      onReceive,
    }: CevitxeOptions<T>) => {
      if (!documentId) throw 'documentId is required'
      const { key, secretKey } = getKeys(documentId)
      const dbName = getDbName(databaseName, documentId)
      const storage = db(dbName)

      const feed: Feed<string> = hypercore(storage, key, { secretKey, valueEncoding, crypto })
      feed.on('error', (err: any) => console.error(err))

      const feedReady = new Promise(ok => feed.on('ready', ok))
      await feedReady
      log('feed ready')

      const hasPersistedData = feed.length > 0

      const state: T | {} = hasPersistedData // is there anything in storage?)
        ? await rehydrateFrom(feed) // if so, rehydrate state from that
        : initialize(feed, defaultState) // if not, initialize

      const connections: Connection<T | {}>[] = []
      const docSet = new SingleDocSet<T | {}>(state)
      log('creating initial docSet', state)

      // Create Redux store
      const reducer = adaptReducer(proxyReducer)
      const enhancer = Redux.applyMiddleware(...middlewares, getMiddleware(feed, docSet))
      const store = Redux.createStore(reducer, state as DeepPartial<A.DocSet<T>>, enhancer)

      // Now that we've initialized the store, it's safe to subscribe to the feed without worrying about race conditions
      const hub = signalhub(documentId, peerHubs)
      const swarm = webrtcSwarm(hub, { wrtc })

      log('joining swarm', key)
      swarm.on('peer', (peer: Peer, id: any) => {
        log('peer', id)
        // In unit tests we never get here, because only one peer is signalling
        connections.push(new Connection(docSet, peer, store.dispatch, onReceive))
      })
      return { feed, store, swarm, hub, connections }
    }

    const { feed, store, hub, swarm, connections } = await createStore({
      documentId,
      defaultState,
      databaseName: this.databaseName,
      peerHubs: this.peerHubs,
      proxyReducer: this.proxyReducer,
      middlewares: this.middlewares,
      onReceive: this.onReceive,
    })
    this.feed = feed
    this.stores[documentId] = store
    this.swarm = swarm
    this.connections = connections
    return store
  }

  getStore = (documentId: string) => this.stores[documentId]

  close = async (documentId: string) => {
    delete this.stores[documentId]
    if (this.feed) await promisify(this.feed, 'close')
    if (this.hub) await promisify(this.hub.close)
    if (this.swarm) await promisify(this.swarm.close)
    if (this.connections) this.connections.forEach(c => c.close())
    this.feed = undefined
    this.hub = undefined
    this.swarm = undefined
    this.connections = undefined
  }
}

interface Emitter {
  on: (event: any, cb: () => void) => void
}

function promisify(emitter: Emitter, event: string): Promise<void> // overload for emmiter event
function promisify(cb: (...args: any[]) => void): Promise<void> // overload for node callback
// implementation
function promisify(obj: Emitter | Function, event?: string): Promise<void> | void {
  if (typeof obj !== 'function' && obj.on && event) {
    return new Promise(ok => obj.on(event!, ok))
  } else if (typeof obj === 'function') {
    const fn = obj
    return new Promise(ok => fn(ok))
  }
}

const rehydrateFrom = async <T>(feed: Feed<string>) => {
  const batch = new Promise(yes => feed.getBatch(0, feed.length, (_, data) => yes(data)))
  const data = (await batch) as string[]
  const changeSets = data.map(d => JSON.parse(d))
  log('rehydrating from stored change sets', changeSets)
  let state = A.init<T>()
  changeSets.forEach(changes => (state = A.applyChanges(state, changes)))
  return state
}

const initialize = <T>(feed: Feed<string>, initialState: T) => {
  log('nothing in storage; initializing')
  const state = A.from(initialState)
  const changeSet = A.getChanges(A.init(), state)
  feed.append(JSON.stringify(changeSet))
  return state
}

export const getDbName = (databaseName: string, documentId: string) =>
  `${databaseName}-${documentId.substr(0, 12)}`
