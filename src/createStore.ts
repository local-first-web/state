import automerge from 'automerge'
import hypercore from 'hypercore'
import pump from 'pump'
import db from 'random-access-idb'
import Redux from 'redux'
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
import { MSG_INVALID_KEY } from './constants'

const log = debug('cevitxe:createStore')

const defaultPeerHubs = ['https://signalhub-jccqtwhdwc.now.sh/'] // default public signaling server
const valueEncoding = 'utf-8'
const crypto = mockCrypto

export const createStore = <T>({
  key,
  secretKey,
  databaseName = 'data',
  peerHubs = defaultPeerHubs,
  proxyReducer,
  defaultState,
  middlewares = [],
}: CreateStoreOptions<T>): Promise<Redux.Store> =>
  new Promise((yay, nay) => {
    if (!validateKeys(key, secretKey)) nay(MSG_INVALID_KEY)
    // Init an indexedDB
    const storeName = `${databaseName}-${key.substr(0, 12)}`
    const storage = db(storeName)

    // Create a new hypercore feed
    const feed: Feed<string> = hypercore(storage, key, { secretKey, valueEncoding, crypto })

    feed.on('ready', async () => {
      log(`feed ready (length ${feed.length})`)

      const state: T = feed.length // if are already changes in the feed (e.g. from storage)
        ? await rehydrateFrom(feed) // use those changes to reconstruct our state
        : initialize(feed, defaultState) // otherwise this is our first time, so we

      const reducer = adaptReducer(proxyReducer)
      const enhancer = Redux.applyMiddleware(...middlewares, getMiddleware(feed))
      const store = Redux.createStore(reducer, state, enhancer)

      // Now that the store has been initialized, it's safe to join the swarm and start handling
      // data from the feed without worrying about race conditions
      joinSwarm(key, peerHubs, feed)

      const stream = feed.createReadStream({ start: feed.length, live: true })

      // From now on, listen for new items the feed and dispatch them to our redux store
      stream.on('data', (value: string) => {
        const change = JSON.parse(value)
        log('dispatch from feed data', change.message)
        store.dispatch(actions.applyChange(change))
      })

      yay(store)
    })

    feed.on('error', (err: any) => console.error(err))
  })

const rehydrateFrom = async <T>(feed: Feed<string>): Promise<T> => {
  const data: string[] = await new Promise((y, n) =>
    feed.getBatch(0, feed.length, (err: any, data: string[]) => (err ? n(err) : y(data)))
  )
  log('rehydrating from stored changes', data)
  const changes = data.map(d => JSON.parse(d))
  return automerge.applyChanges(automerge.init(), changes)
}

const initialize = <T>(feed: Feed<string>, defaultState: T): T => {
  log('feed empty; initializing')
  // If the feed is empty, we're in a first-run scenario; so we need to add the initial automerge state to the
  // feed. (This check is why `createStore` has to return a promise: we don't know if there's anything in the feed
  // until we're in this callback.)
  const state = automergify(defaultState)
  const initializationChanges = automerge.getChanges(automerge.init(), state)
  initializationChanges.forEach(change => feed.append(JSON.stringify(change)))

  // TODO: handle remote first-run situations.
  // This doesn't take into account a scenario where the feed isn't empty, but we're not the author of the feed so
  // we can't just set it to its initial state - we simply have to wait until we've heard from the author.
  return state
}

const joinSwarm = (key: string, peerHubs: string[], feed: Feed<string>) => {
  const hub = signalhub(key, peerHubs)
  const swarm = webrtcSwarm(hub)
  log('joined swarm', key)
  swarm.on('peer', (peer: any, id: any) => {
    log('peer', id, peer)
    const options = { encrypt: false, live: true, upload: true, download: true }
    pump(peer, feed.replicate(options), peer)
  })
}
