//import automerge from 'automerge'
import { Buffer } from 'buffer'
import hypercore from 'hypercore'
import crypto from 'hypercore-crypto'
import pump from 'pump'
import rai from 'random-access-idb'
import { createStore as createReduxStore, Reducer, Action, StoreEnhancer, Store, DeepPartial } from 'redux'
import signalhub from 'signalhub'
import swarm from 'webrtc-swarm'

//import { actions } from './actions'
//import { addMiddleware } from './dynamicMiddleware'
import { mockCrypto } from './mockCrypto'

// This is currently a class but might make more sense as just a function
const CevitxeFeed = () => {
  // private reduxStore: Store
  let feed: Feed<any>
  let databaseName: string
  let key: Key
  let secretKey: Key
  let peerHubs: Array<string>

  const createFeed = (options: any) => {
    if (!options.key)
      throw new Error('Key is required, should be XXXX in length')
    // hypercore seems to be happy when I turn the key into a discoveryKey,
    // maybe we could get away with just using a Buffer (or just calling discoveryKey with a string?)
    key = crypto.discoveryKey(Buffer.from(options.key))
    if (!options.secretKey)
      throw new Error('Secret key is required, should be XXXX in length')

    // hypercore doesn't seem to like the secret key being a discoveryKey,
    // but rather just a Buffer
    secretKey = Buffer.from(options.secretKey)
    databaseName = options.databaseName || 'data'
    peerHubs = options.peerHubs || [
      'https://signalhub-jccqtwhdwc.now.sh/', // default public signaling server
    ]

    // Init an indexedDB
    // I'm constructing a name here using the key because re-using the same name
    // with different keys throws an error "Another hypercore is stored here"
    const todos = rai(`${databaseName}-${getKeyHex().substr(0, 12)}`)
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

    // Inject our custom middleware using redux-dynamic-middlewares
    // I did this because we need a middleware that can use our feed instance
    // An alternative might be to instantiate Feed and then create the redux store,
    // then you'd just need a Feed.assignStore(store) method or something to give this
    // class a way to dispatch to the store.
    //addMiddleware(feedMiddleware)

    return { createStore }
  }

  // This middleware has an extra function at the beginning that takes
  // a 'store' param, which we're not using so it's omitted.
  // This is an implementation detail with redux-dynamic-middlewares
  // const feedMiddleware: Middleware = store => next => action => {
  //   // feed.append(JSON.stringify(action.payload.action))
  //   const prevState = store.getState()
  //   const result = next(action)
  //   const nextState = store.getState()
  //   const changes = automerge.getChanges(prevState, nextState)
  //   changes.forEach(c => feed.append(JSON.stringify(c)))
  //   return result
  // }

  // Read items from this and peer feeds,
  // then dispatch them to our redux store
  const startStreamReader = () => {
    // Wire up reading from the feed
    const stream = feed.createReadStream({ live: true })
    stream.on('data', (value: string) => {
      try {
        const change = JSON.parse(value)
        console.log('onData', change)
        //reduxStore.dispatch(actions.applyChange(change))
      } catch (err) {
        console.log('feed read error', err)
        console.log('feed stream returned an unknown value', value)
      }
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
  
  // This follows the type definitions for StoreCreator's two overloads in the Redux source
  function createStore <S, A extends Action>(reducer: Reducer<S, A>, enhancer?: StoreEnhancer<any>): Store<S, A>
  function createStore <S, A extends Action>(reducer: Reducer<S, A>, preloadedState?: DeepPartial<S>, enhancer?: StoreEnhancer<any>): Store<S, A>
  function createStore <S, A extends Action>(reducer: Reducer<S, A>, preloadedState_orEnhancer?: DeepPartial<S> | StoreEnhancer<any>, enhancer_or_undefined?: StoreEnhancer<any>) {
    let enhancer: StoreEnhancer<any>
    let preloadedState: DeepPartial<S> | StoreEnhancer<any> | undefined

    if (enhancer_or_undefined !== undefined) {
      preloadedState = preloadedState_orEnhancer
      enhancer = enhancer_or_undefined
    } else {
      enhancer = preloadedState_orEnhancer as StoreEnhancer<any>
    }
    
    console.log('add a feed-enabled reducer here')
    // inject our reducer here
    if (preloadedState !== undefined)
      return createReduxStore(reducer, preloadedState as DeepPartial<S>, enhancer as StoreEnhancer<any>);
    return createReduxStore(reducer, enhancer as StoreEnhancer<any>);
  }

  return { createFeed }
}

const feedInstance = CevitxeFeed();

export const {
  createFeed
} = feedInstance

// export const { CevitxeFeed as Feed }
