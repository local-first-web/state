import A from 'automerge'
import { EventEmitter } from 'events'
import hypercore from 'hypercore'
import db from 'random-access-idb'
import * as Redux from 'redux'
import { DeepPartial, Middleware, Store } from 'redux'
import signalhub from 'signalhub'
import { Instance as Peer } from 'simple-peer'
import webrtcSwarm from 'webrtc-swarm'
const wrtc = require('wrtc')

import debug from './helpers/debug'

import { adaptReducer } from './adaptReducer'
import { Connection } from './connection'
import { DEFAULT_PEER_HUBS } from './constants'
import { getMiddleware } from './getMiddleware'
import { getKeys } from './keyManager'
import { SingleDocSet } from './SingleDocSet'
import { CevitxeOptions, ProxyReducer } from './types'
import { promisify } from './helpers/promisify'

const valueEncoding = 'utf-8'

const log = debug('cevitxe')

export class Cevitxe<T> extends EventEmitter {
  private proxyReducer: ProxyReducer<any>
  private middlewares: Middleware[] // TODO: accept an `enhancer` object instead
  private initialState: T

  private onReceive?: Function
  private databaseName: string
  private peerHubs: string[]

  private feed?: Feed<string>
  private hub?: any
  private swarm?: any
  private connections?: Connection[]
  private store?: Store

  constructor({
    databaseName = 'cevitxe-data',
    proxyReducer,
    initialState,
    peerHubs = DEFAULT_PEER_HUBS,
    middlewares = [],
    onReceive,
  }: CevitxeOptions<T>) {
    super()
    this.proxyReducer = proxyReducer
    this.middlewares = middlewares
    this.initialState = initialState
    this.onReceive = onReceive
    this.databaseName = databaseName
    this.peerHubs = peerHubs
  }

  joinStore = (documentId: string) => this.newStore(documentId)

  createStore = (documentId: string) => this.newStore(documentId, this.initialState)

  newStore = async (documentId: string, initialState = {}) => {
    const rehydrateFrom = async (feed: Feed<string>) => {
      const batch = new Promise(yes => feed.getBatch(0, feed.length, (_, data) => yes(data)))
      const data = (await batch) as string[]
      const changeSets = data.map(d => JSON.parse(d))
      log('rehydrating from stored change sets', changeSets)
      let state = A.init<T>()
      changeSets.forEach(changes => (state = A.applyChanges(state, changes)))
      return state
    }

    const initialize = (feed: Feed<string>) => {
      log('nothing in storage; initializing')
      const state = A.from(initialState)
      const changeSet = A.getChanges(A.init(), state)
      feed.append(JSON.stringify(changeSet))
      return state
    }

    if (!documentId) throw 'documentId is required'
    const { key, secretKey } = getKeys(documentId)
    const dbName = getDbName(this.databaseName, documentId)
    const storage = db(dbName)

    const feed = hypercore(storage, key, { secretKey, valueEncoding })
    feed.on('error', (err: any) => console.error(err))
    const feedReady = new Promise(ok => feed.on('ready', ok))
    await feedReady
    this.feed = feed
    log('feed ready')

    const hasPersistedData = feed.length > 0

    const state: T | {} = hasPersistedData // is there anything in storage?)
      ? await rehydrateFrom(feed) // if so, rehydrate state from that
      : initialize(feed) // if not, initialize

    log('creating initial docSet', state)
    const connections: Connection<T | {}>[] = []
    const docSet = new SingleDocSet<T | {}>(state)

    // Create Redux store
    const reducer = adaptReducer(this.proxyReducer)
    const enhancer = Redux.applyMiddleware(...this.middlewares, getMiddleware(feed, docSet))
    this.store = Redux.createStore(reducer, state as DeepPartial<A.DocSet<T>>, enhancer)

    // Now that we've initialized the store, it's safe to subscribe to the feed without worrying about race conditions
    log('joining swarm', key)
    this.hub = signalhub(documentId, this.peerHubs)
    this.swarm = webrtcSwarm(this.hub, { wrtc })

    // For each peer that wants to connect, create a Connection object
    this.swarm.on('peer', (peer: Peer, id: any) => {
      log('peer', id)
      connections.push(new Connection(docSet, peer, this.store!.dispatch, this.onReceive))
    })

    return this.store
  }

  getStore = () => this.store

  close = async () => {
    this.store = undefined
    if (this.connections) await this.connections.forEach(async c => await c.close())
    // if (this.feed) await promisify(this.feed.close)
    if (this.swarm) await promisify(this.swarm.close)
    if (this.hub) await promisify(this.hub.close)
    // this.feed = undefined
    // this.hub = undefined
    // this.swarm = undefined
    // this.connections = undefined
  }
}

export const getDbName = (databaseName: string, documentId: string) =>
  `${databaseName}-${documentId.substr(0, 12)}`
