import A from 'automerge'
import hypercore from 'hypercore'
import db from 'random-access-idb'
import * as Redux from 'redux'
import { DeepPartial } from 'redux'
import signalhub from 'signalhub'
import { Instance as Peer } from 'simple-peer'
import webrtcSwarm from 'webrtc-swarm'
import { adaptReducer } from './adaptReducer'
const wrtc = require('wrtc')

import { Connection } from './connection'
import { DEFAULT_PEER_HUBS } from './constants'
import debug from './debug'
import { getMiddleware } from './getMiddleware'
import { getKeys } from './keyManager'
import { SingleDocSet } from './SingleDocSet'
import { CevitxeOptions, CreateStoreResult } from './types'

const log = debug('cevitxe:createStore')

const valueEncoding = 'utf-8'

export const createStore = async <T>({
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

  const feed: Feed<string> = hypercore(storage, key, { secretKey, valueEncoding })
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
