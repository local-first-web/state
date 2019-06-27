import automerge, { Change, DocSet, Message } from 'automerge'
import * as Redux from 'redux'
import { DeepPartial } from 'redux'
import signalhub from 'signalhub'
import webrtcSwarm from 'webrtc-swarm'
import { Instance as Peer } from 'simple-peer'
import { adaptReducer } from './adaptReducer'
import { automergify } from './automergify'
import { Connection } from './connection'
import { DEFAULT_PEER_HUBS } from './constants'
import debug from './debug'
import { SingleDocSet } from './SingleDocSet'
import { getMiddleware } from './getMiddleware'
import { getKeys } from './keyManager'
import { CreateStoreOptions } from './types'

const log = debug('cevitxe:createStore')

const valueEncoding = 'utf-8'

export const createStore = async <T>({
  databaseName = 'cevitxe-data',
  peerHubs = DEFAULT_PEER_HUBS,
  proxyReducer,
  defaultState = {}, // If defaultState is not provided, we're joining an existing store
  middlewares = [],
  discoveryKey,
  onReceive,
}: CreateStoreOptions<T>): Promise<Redux.Store> => {
  const { key, secretKey } = getKeys(discoveryKey)
  log('handed onReceive', onReceive)

  const hasPersistedData = false

  const state: T | {} = hasPersistedData // is there anything in the feed already? (e.g. coming from storage)
    ? await rehydrateFrom() // if so, rehydrate state from that
    : initialize(defaultState) // if not, initialize

  const connections: Connection<T | {}>[] = []
  const docSet = new SingleDocSet<T | {}>(state)
  log('creating initial docSet', state)

  // Create Redux store
  const reducer = adaptReducer(proxyReducer)
  const enhancer = Redux.applyMiddleware(...middlewares, getMiddleware(docSet))
  const store = Redux.createStore(reducer, state as DeepPartial<DocSet<T>>, enhancer)

  // Now that we've initialized the store, it's safe to subscribe to the feed without worrying about race conditions
  const hub = signalhub(discoveryKey, peerHubs)
  const swarm = webrtcSwarm(hub)

  log('joined swarm', key)
  swarm.on('peer', (peer: Peer, id: any) => {
    log('peer', peer)
    connections.push(new Connection(docSet, peer, store.dispatch, onReceive))
  })

  return store
}

// TODO: Get persistence back
const rehydrateFrom = async <T>(): Promise<T> => {
  return {} as T
  // log('rehydrating from stored messages')
  // const batch = new Promise(yes => feed.getBatch(0, feed.length, (_, data) => yes(data)))
  // const data = (await batch) as string[]
  // const messages = data.map(d => JSON.parse(d))
  // let state = automerge.init<T>()
  // messages.forEach(m => (state = automerge.applyChanges(state, m.changes)))
  // return state
}

const initialize = <T>(defaultState: T): T => {
  log('nothing in storage; initializing')
  const state = automergify(defaultState)
  // const changes = automerge.getChanges(automerge.init(), state)
  // const message = { clock: {}, changes }
  //feed.append(JSON.stringify(message))
  return state
}

export const joinStore = createStore
