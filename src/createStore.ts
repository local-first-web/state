import automerge from 'automerge'
import { Buffer } from 'buffer'
import hypercore from 'hypercore'
import crypto from 'hypercore-crypto'
import pump from 'pump'
import rai from 'random-access-idb'
import Redux from 'redux'
import signalhub from 'signalhub'
import swarm from 'webrtc-swarm'

import { adaptReducer } from './adaptReducer'
import { actions } from './actions'
import { automergify } from './automergify'
import { mockCrypto } from './mockCrypto'
import { CreateStoreOptions } from './types'
import { getMiddleware } from './getMiddleware'

let feed: Feed<any>
let key: Key
let secretKey: Key
let databaseName: string
let peerHubs: Array<string>
let store: Redux.Store

export const createStore = (options: CreateStoreOptions): Promise<Redux.Store> => {
  return new Promise((resolve, _) => {
    if (!options.key) throw new Error('Key is required, should be XXXX in length')

    // hypercore seems to be happy when I turn the key into a discoveryKey,
    // maybe we could get away with just using a Buffer (or just calling discoveryKey with a string?)
    key = crypto.discoveryKey(Buffer.from(options.key))

    if (!options.secretKey) throw new Error('Secret key is required, should be XXXX in length')

    // hypercore doesn't seem to like the secret key being a discoveryKey, but rather just a Buffer
    secretKey = Buffer.from(options.secretKey)

    databaseName = options.databaseName || 'data'
    peerHubs = options.peerHubs || ['https://signalhub-jccqtwhdwc.now.sh/'] // default public signaling server

    // Init an indexedDB
    const storeName = `${databaseName}-${getKeyHex().substr(0, 12)}`
    const storage = rai(storeName)

    // Create a new hypercore feed
    feed = hypercore(storage, key, {
      secretKey,
      valueEncoding: 'utf-8',
      crypto: mockCrypto,
    })

    const stream = feed.createReadStream({ live: true })

    feed.on('ready', () => {
      joinSwarm()

      store = createReduxStore({
        ...options,
        preloadedState: feed.length === 0 ? options.preloadedState : null,
      })

      if (feed.length === 0) {
        // If the feed is empty, we're in a first-run scenario;
        // so we need to add the initial automerge state to the feed.
        // (This check is why `createStore` has to return a promise:
        // we don't know if there's anything in the feed until we're
        // in this callback.)
        // TODO handle remote first-run situations
        // This doesn't take into account a scenario where the
        // feed isn't empty, but we're not the author of the feed so
        // we can't just set it to its initial state - we simply have to
        // wait until we've heard from the author.
        const state = store.getState()
        const history = automerge.getChanges(automerge.init(), state)
        history.forEach(c => feed.append(JSON.stringify(c)))
      }

      resolve(store)
    })

    stream.on('data', (value: string) => {
      // read items from the feeds (our storage + changes from peers)
      const change = JSON.parse(value)
      // then dispatch them to our redux store
      store.dispatch(actions.applyChange(change))
    })

    feed.on('error', (err: any) => console.log(err))
  })
}

// Join our feed to the swarm and accept peers
const joinSwarm = () => {
  // could add option to disallow peer connectivity here
  const hub = signalhub(getKeyHex(), peerHubs)
  const sw = swarm(hub)
  sw.on('peer', onPeerConnect)
}

// When a feed peer connects, replicate our feed to them
const onPeerConnect = (peer: any, id: any) => {
  console.log('peer', id, peer)
  pump(
    peer,
    feed.replicate({
      encrypt: false,
      live: true,
      upload: true,
      download: true,
    }),
    peer
  )
}

const getKeyHex = () => key.toString('hex')

const createReduxStore = ({ middlewares = [], preloadedState, proxyReducer }: CreateStoreOptions) => {
  middlewares.push(getMiddleware(feed))
  const enhancer = Redux.applyMiddleware(...middlewares)
  const initialState = preloadedState ? automergify(preloadedState) : undefined
  const reducer = adaptReducer(proxyReducer)
  return Redux.createStore(reducer, initialState, enhancer)
}
