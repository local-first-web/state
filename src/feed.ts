import automerge from 'automerge'
import { Buffer } from 'buffer'
import hypercore from 'hypercore'
import crypto from 'hypercore-crypto'
import pump from 'pump'
import rai from 'random-access-idb'
//import reduceReducers from 'reduce-reducers'
import {
  //Action,
  applyMiddleware,
  createStore as reduxCreateStore,
  //DeepPartial,
  Middleware,
  Reducer,
  Store,
  //Store,
  //StoreEnhancer,
} from 'redux'
import signalhub from 'signalhub'
import swarm from 'webrtc-swarm'
//import { adaptReducer } from './adaptReducer'
import { initialize } from './initialize'
import { actions } from './actions'
import { mockCrypto } from './mockCrypto'

export const keyString =
  'ecc6212465b39a9a704d564f07da0402af210888e730f419a7faf5f347a33b3d'
export const secretKeyString =
  '2234567890abcdef1234567880abcdef1234567890abcdef1234567890fedcba'

// hypercore seems to be happy when I turn the key into a discoveryKey,
// maybe we could get away with just using a Buffer (or just calling discoveryKey with a string?)
const key: Key = crypto.discoveryKey(Buffer.from(keyString))
// hypercore doesn't seem to like the secret key being a discoveryKey,
// but rather just a Buffer
const secretKey: Key = Buffer.from(secretKeyString)

interface CevitxeStoreOptions {
  // Redux store
  reducer: Reducer
  preloadedState?: any
  middlewares?: Middleware[]
  // hypercore feed options
  databaseName?: string
  peerHubs?: string[]
}

// This is currently a class but might make more sense as just a function
const CevitxeFeed = () => {
  let feed: Feed<any>
  let databaseName: string
  let peerHubs: Array<string>
  let reduxStore: Store

  const createStore = (options: CevitxeStoreOptions) => {
    databaseName = options.databaseName || 'data'
    peerHubs = options.peerHubs || [
      'https://signalhub-jccqtwhdwc.now.sh/', // default public signaling server
    ]

    // Init an indexedDB
    const todos = rai(getStoreName())
    const storage = (filename: any) => todos(filename)

    // Create a new hypercore feed
    feed = hypercore(storage, key, {
      secretKey: secretKey,
      valueEncoding: 'utf-8',
      crypto: mockCrypto,
    })
    feed.on('error', (err: any) => console.log(err))

    feed.on('ready', () => {
      console.log('ready', key.toString('hex'))
      console.log('discovery', feed.discoveryKey.toString('hex'))
      joinSwarm()
    })

    startStreamReader()

    // Return the new Redux store
    reduxStore = createReduxStore(options)
    // Write the initial automerge state to the feed
    //const storeState = reduxStore.getState()
    console.log('todos', todos)
    debugger
    // if (storeState !== null && storeState !== undefined) {
    //   const history = automerge.getChanges(automerge.init(), storeState)
    //   history.forEach(c => feed.append(JSON.stringify(c)))
    //   console.log('writing initial state to feed')
    //   // write history as an array of changes, abondonded for individual change writing
    //   //feed.append(JSON.stringify(history))
    // }
    return reduxStore
  }

  const feedMiddleware: Middleware = store => next => action => {
    // feed.append(JSON.stringify(action.payload.action))
    const prevState = store.getState()
    const result = next(action)
    // Don't re-write items to the feed
    if (action.payload.fromCevitxe) {
      console.log('already from cevitxe, skipping the feed write')
      return result
    }
    const nextState = store.getState()
    const existingState = prevState ? prevState : automerge.init()
    console.log('existingState', existingState)
    console.log('nextState', nextState)
    const changes = automerge.getChanges(existingState, nextState)
    changes.forEach(c => feed.append(JSON.stringify(c)))
    return result
  }

  // Read items from this and peer feeds,
  // then dispatch them to our redux store
  const startStreamReader = () => {
    // Wire up reading from the feed
    const stream = feed.createReadStream({ live: true })
    stream.on('data', (value: string) => {
      // try {
      const change = JSON.parse(value)
      console.log('onData', change)
      reduxStore.dispatch(actions.applyChange(change))
      // } catch (err) {
      //   console.log('feed read error', err)
      //   console.log('feed stream returned an unknown value', value)
      // }
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
  // I'm constructing a name here using the key because re-using the same name
  // with different keys throws an error "Another hypercore is stored here"
  const getStoreName = () => `${databaseName}-${getKeyHex().substr(0, 12)}`

  const createReduxStore = (options: CevitxeStoreOptions) => {
    // let enhancer: StoreEnhancer<any> | undefined
    let initialState: any
    // let preloadedStateProvided: Boolean = false

    // // We received 2 params: reducer and enhancer
    // if (
    //   typeof preloadedState_orEnhancer === 'function' &&
    //   typeof enhancer_or_undefined === 'undefined'
    // ) {
    //   enhancer = preloadedState_orEnhancer
    //   initialState = undefined
    // } else {
    //   preloadedStateProvided = true
    //   enhancer = enhancer_or_undefined
    //   // Convert the plain object preloadedState to Automerge using initialize()
    //   initialState = initialize(preloadedState_orEnhancer as DeepPartial<
    //     S
    //   > | null)
    //   //initialState = preloadedState_orEnhancer as DeepPartial<S> | null
    //   console.log('initialized state', initialState)
    //   // TODO: Push the initial state operations to the feed
    // }

    let optionMiddlewares = options.middlewares ? options.middlewares : []
    const middlewares = [...optionMiddlewares, feedMiddleware]
    // check
    //if (enhancer !== undefined) middlewares.push(enhancer)

    console.log('adding a feed-enabled reducer here')

    // Add the cevitxe reducer at the same level as the user's reducer
    // This allows us to operate at the root state and the user can still
    // have nested state reducers.
    // note: Casting these as Reducer may not be right
    // const combinedReducers = reduceReducers(
    //   null,
    //   adaptReducer as Reducer,
    //   reducer as Reducer
    // )
    // console.log('combined reducers', combinedReducers)

    if (options.preloadedState) {
      // Convert the plain object preloadedState to Automerge using initialize()
      initialState = initialize(options.preloadedState)
      console.log('initialized state', initialState)
      // TODO: Push the initial state operations to the feed

      console.log('creating redux store with initial state', initialState)
      return reduxCreateStore(
        options.reducer,
        initialState,
        applyMiddleware(...middlewares)
      )
    }
    console.log('creating redux store without initial state')
    return reduxCreateStore(
      options.reducer as Reducer,
      applyMiddleware(...middlewares)
    )
  }

  return { createStore }
}

const feedInstance = CevitxeFeed()

export const { createStore } = feedInstance

// export const { CevitxeFeed as Feed }
