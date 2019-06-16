import automerge from 'automerge'
import hypercore from 'hypercore'
import pump from 'pump'
import db from 'random-access-idb'
import Redux from 'redux'
import signalhub from 'signalhub'
import swarm from 'webrtc-swarm'

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

export const createStore = ({
  key,
  secretKey,
  databaseName = 'data',
  peerHubs = defaultPeerHubs,
  proxyReducer,
  preloadedState = {},
  middlewares = [],
}: CreateStoreOptions): Promise<Redux.Store> =>
  new Promise((yay, nay) => {
    if (!validateKeys(key, secretKey)) nay(MSG_INVALID_KEY)
    // Init an indexedDB
    const storeName = `${databaseName}-${key.substr(0, 12)}`
    const storage = db(storeName)

    // Create a new hypercore feed
    const feed = hypercore(storage, key, { secretKey, valueEncoding, crypto })

    feed.on('ready', async () => {
      log(`feed ready (length ${feed.length})`)

      // Join swarm
      const hub = signalhub(key, peerHubs)
      const sw = swarm(hub)
      sw.on('peer', (peer: any, id: any) => {
        log('peer', id, peer)
        pump(peer, feed.replicate({ encrypt: false, live: true, upload: true, download: true }), peer)
      })

      const feedIsEmpty = feed.length === 0
      let initialState: any

      if (!feedIsEmpty) {
        // const promiseRead = (path, options) =>
        //   new Promise((resolve, reject) => {
        //     fs.readFile(path, options, (error, data) => {
        //       error ? reject(error) : resolve(data);
        //     });

        const data: string[] = await new Promise((yay, nay) =>
          feed.getBatch(0, feed.length, (err: any, data: any) => (err ? nay(err) : yay(data)))
        )

        log('feed initial batch', data)
        initialState = automerge.applyChanges(automerge.init(), data.map(d => JSON.parse(d)))
        log('state rehydrated from stored feed', initialState)
      } else {
        //
        initialState = automergify(preloadedState)
      }

      const reducer = adaptReducer(proxyReducer)
      const enhancer = Redux.applyMiddleware(...middlewares, getMiddleware(feed))

      const store = Redux.createStore(reducer, initialState, enhancer)

      if (feedIsEmpty) {
        log('feed empty')
        // If the feed is empty, we're in a first-run scenario; so we need to add the initial automerge state to the
        // feed. (This check is why `createStore` has to return a promise: we don't know if there's anything in the feed
        // until we're in this callback.)
        const history = automerge.getChanges(automerge.init(), store.getState())
        history.forEach(c => feed.append(JSON.stringify(c)))

        // TODO: handle remote first-run situations.
        // This doesn't take into account a scenario where the feed isn't empty, but we're not the author of the feed so
        // we can't just set it to its initial state - we simply have to wait until we've heard from the author.
      }

      const stream = feed.createReadStream({ start: feed.length, live: true })

      stream.on('data', (value: string) => {
        // Read items from the feeds (our storage + changes from peers)
        const change = JSON.parse(value)
        log('stream data', change.message)

        // then dispatch them to our redux store
        store.dispatch(actions.applyChange(change))
      })

      yay(store)
    })

    feed.on('error', (err: any) => console.error(err))
  })
