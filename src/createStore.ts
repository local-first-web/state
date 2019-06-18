import automerge from 'automerge'
import hypercore from 'hypercore'
import db from 'random-access-idb'
import * as Redux from 'redux'
import signalhub from 'signalhub'
import webrtcSwarm from 'webrtc-swarm'

import { actions } from './actions'
import { adaptReducer } from './adaptReducer'
import { automergify } from './automergify'
import debug from './debug'
import { getMiddleware } from './getMiddleware'
import { mockCrypto } from './mockCrypto'
import { CreateStoreOptions } from './types'
import { validateKeys } from './validateKeys'
import { MSG_INVALID_KEYS } from './constants'
import { CevitxeConnection } from './connection'

const log = debug('cevitxe:createStore')

const defaultPeerHubs = ['https://signalhub-jccqtwhdwc.now.sh/'] // default public signaling server
const valueEncoding = 'utf-8'
const crypto = mockCrypto

export const createStore = async <T>({
  key,
  secretKey,
  databaseName = 'cevitxe-data',
  peerHubs = defaultPeerHubs,
  proxyReducer,
  defaultState,
  middlewares = [],
}: CreateStoreOptions<T>): Promise<Redux.Store> => {
  if (!validateKeys(key, secretKey)) throw new Error(MSG_INVALID_KEYS)

  // Init an indexedDB
  const storeName = `${databaseName}-${key.substr(0, 12)}`
  const storage = db(storeName)

  // Create a new hypercore feed
  const feed: Feed<string> = hypercore(storage, key, { secretKey, valueEncoding, crypto })
  feed.on('error', (err: any) => console.error(err))

  const feedReady = new Promise(yes => feed.on('ready', () => yes()))
  await feedReady

  log.groupCollapsed(`feed ready; ${feed.length} stored changes`)

  // if keys
  // - join swarm
  // - intialize store using peer snapshot?
  // - what if we have a local store already with this key?

  // if no keys
  // - generate keys
  // - iniialize store from default state
  // - create store
  // - join swarm

  // This check is why `createStore` is async: we don't know if the feed has changes until `feed.on('ready')`.
  const state: T = feed.length //       If there are already changes in the feed (e.g. from storage),
    ? await rehydrateFrom(feed) //      use those changes to reconstruct our state;
    : initialize(feed, defaultState) // otherwise this is our first time, so we start with default state.

  // Create Redux store
  const reducer = adaptReducer(proxyReducer)
  const enhancer = Redux.applyMiddleware(...middlewares, getMiddleware(feed))
  const store = Redux.createStore(reducer, state, enhancer)

  const connections: CevitxeConnection[] = []
  const docSet = new automerge.DocSet()
  docSet.setDoc(key, store.getState())

  // // Now that we've initialized the store, it's safe to subscribe to the feed without worrying about race conditions
  // const hub = signalhub(key, peerHubs)
  // const swarm = webrtcSwarm(hub)

  // log('joined swarm', key)
  // swarm.on('peer', (peer: any, id: any) => {
  //   log('peer', id, peer)
  //   const options = { encrypt: false, live: true, upload: true, download: true }
  //   const connection = new CevitxeConnection(docSet, peer)
  //   connections.push(connection)
  //   //pump(peer, feed.replicate(options), peer)
  // })

  const start = feed.length // skip any items we already read when initializing
  const stream = feed.createReadStream({ start, live: true })

  // Listen for new items the feed and dispatch them to our redux store
  stream.on('data', (data: string) => {
    const change = JSON.parse(data)
    log('dispatch from feed', change.message)
    store.dispatch(actions.applyChange(change))

    // connections.forEach(connection => {
    //   const newDocState = connection.receiveData(data)
    //   // get changes
    //   store.dispatch(actions.applyChange(change))
    // })
  })
  log.groupEnd()
  return store
}

const rehydrateFrom = async <T>(feed: Feed<string>): Promise<T> => {
  const batch = new Promise(yes => feed.getBatch(0, feed.length, (_, data) => yes(data)))
  const data = (await batch) as string[]
  const changes = data.map(d => JSON.parse(d))
  log('rehydrating from stored changes', changes.map(change => change.message))
  const state = automerge.applyChanges(automerge.init<T>(), changes)
  return state
}

const initialize = <T>(feed: Feed<string>, defaultState: T): T => {
  log('nothing in storage; initializing')
  const state = automergify(defaultState)
  const initializationChanges = automerge.getChanges(automerge.init(), state)
  initializationChanges.forEach(change => feed.append(JSON.stringify(change)))
  return state
}
