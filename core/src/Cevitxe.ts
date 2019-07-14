import A from 'automerge'
import { debug } from 'debug-deluxe'
import { EventEmitter } from 'events'
import hypercore from 'hypercore'
import db from 'random-access-idb'
import * as Redux from 'redux'
import { Middleware, Store } from 'redux'
import signalhub from 'signalhub'
import { Instance as Peer } from 'simple-peer'
import webrtcSwarm from 'webrtc-swarm'

import { adaptReducer } from './adaptReducer'
import { Connection } from './connection'
import { DEFAULT_PEER_HUBS } from './constants'
import { getMiddleware } from './getMiddleware'
import { promisify } from './helpers/promisify'
import { getKeys } from './keys'
import { SingleDocSet } from './SingleDocSet'
import { CevitxeOptions, ProxyReducer } from './types'

const wrtc = require('wrtc')

const valueEncoding = 'utf-8'

let log = debug('cevitxe')

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
  private connections: Connection[]
  private store?: Store

  constructor({
    databaseName,
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
    this.connections = []
  }

  joinStore = (documentId: string) => this.makeStore(documentId, false)

  createStore = (documentId: string) => this.makeStore(documentId, true)

  makeStore = async (documentId: string, creating: boolean = false) => {
    log = debug(`cevitxe:${creating ? 'createStore' : 'joinStore'}:${documentId}`)

    this.feed = await createStorageFeed(documentId, this.databaseName)

    const state = creating
      ? setInitialState(this.feed, this.initialState)
      : this.feed.length > 0
      ? await getStateFromStorage(this.feed)
      : setInitialState(this.feed, {})

    log('creating initial docSet', JSON.stringify(state))
    const docSet = new SingleDocSet(state)

    // Create Redux store
    const reducer = adaptReducer(this.proxyReducer)
    const cevitxeMiddleware = getMiddleware(this.feed, docSet)
    const enhancer = Redux.applyMiddleware(...this.middlewares, cevitxeMiddleware)
    this.store = Redux.createStore(reducer, state, enhancer)

    log('joining swarm')
    this.hub = signalhub(documentId, this.peerHubs)
    this.swarm = webrtcSwarm(this.hub, { wrtc })

    // For each peer that wants to connect, create a Connection object
    this.swarm.on('peer', (peer: Peer, id: any) => {
      log('connecting to peer', id)
      const connection = new Connection(docSet, peer, this.store!.dispatch, this.onReceive)
      this.connections.push(connection)
    })

    return this.store
  }

  get connectionCount() {
    return this.connections.length
  }

  getStore = () => this.store

  close = async () => {
    this.store = undefined
    if (this.connections) await this.connections.forEach(async c => await c.close())
    if (this.feed) await promisify(this.feed.close)
    // if (this.swarm) await promisify(this.swarm.close)
    // if (this.hub) await promisify(this.hub.close)
    this.feed = undefined
    this.hub = undefined
    this.swarm = undefined
    this.connections = []
  }
}

const getStateFromStorage = async (feed: Feed<string>) => {
  const batch = new Promise(yes => feed.getBatch(0, feed.length, (_, data) => yes(data)))
  const data = (await batch) as string[]
  const changeSets = data.map(d => JSON.parse(d))
  log('rehydrating from stored change sets', changeSets)
  let state = A.init()
  changeSets.forEach(changes => (state = A.applyChanges(state, changes)))
  return state
}

const setInitialState = <T>(feed: Feed<string>, initialState: T) => {
  log('nothing in storage; initializing', JSON.stringify(initialState))
  const state = A.from(initialState)
  const changeSet = A.getChanges(A.init(), state)
  feed.append(JSON.stringify(changeSet))
  return state
}

const createStorageFeed = async (documentId: string, databaseName: string) => {
  log('creating storage feed')
  const { key, secretKey } = getKeys(documentId)
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
