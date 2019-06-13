import { Buffer } from 'buffer'
import hypercore from 'hypercore'
import crypto from 'hypercore-crypto'
import pump from 'pump'
import rai from 'random-access-idb'
import { Store, Middleware, Reducer } from 'redux'
import signalhub from 'signalhub'
import swarm from 'webrtc-swarm'
import { addMiddleware } from './dynamicMiddleware'
import { mockCrypto } from './mockCrypto'
import automerge from 'automerge'

const APPLY_CHANGE = '__CEVITXE_APPLY_CHANGE__'

const actions = {
  applyChange: (change: automerge.Change<any>) => ({
    type: APPLY_CHANGE,
    payload: { change },
  }),
}

const reducer: Reducer = (prevState, { type, payload }) => {
  console.log('our reducer', payload)
  switch (type) {
    case APPLY_CHANGE:
      return automerge.applyChanges(prevState, [payload.change])
    default:
      return prevState
  }
}

// This is currently a class but might make more sense as just a function
class CevitxeFeed {
  private reduxStore: Store
  private feed: Feed<any>
  private databaseName: string
  private key: Key
  private secretKey: Key
  private peerHubs: Array<string>

  constructor(reduxStore: any, options: any) {
    if (!options.key)
      throw new Error('Key is required, should be XXXX in length')
    // hypercore seems to be happy when I turn the key into a discoveryKey,
    // maybe we could get away with just using a Buffer (or just calling discoveryKey with a string?)
    this.key = crypto.discoveryKey(Buffer.from(options.key))
    if (!options.secretKey)
      throw new Error('Secret key is required, should be XXXX in length')

    // hypercore doesn't seem to like the secret key being a discoveryKey,
    // but rather just a Buffer
    this.secretKey = Buffer.from(options.secretKey)
    this.databaseName = options.databaseName || 'data'
    this.peerHubs = options.peerHubs || [
      'https://signalhub-jccqtwhdwc.now.sh/', // default public signaling server
    ]
    this.reduxStore = reduxStore

    // add our reducer for handling changes from feed
    this.reduxStore.replaceReducer(reducer)

    // Init an indexedDB
    // I'm constructing a name here using the key because re-using the same name
    // with different keys throws an error "Another hypercore is stored here"
    const todos = rai(`${this.databaseName}-${this.getKeyHex().substr(0, 12)}`)
    const storage = (filename: any) => todos(filename)

    // Create a new hypercore feed
    this.feed = hypercore(storage, this.key, {
      secretKey: this.secretKey,
      valueEncoding: 'utf-8',
      crypto: mockCrypto,
    })
    this.feed.on('error', (err: any) => console.log(err))

    this.feed.on('ready', () => {
      console.log('ready', this.key.toString('hex'))
      console.log('discovery', this.feed.discoveryKey.toString('hex'))
      this.joinSwarm()
    })

    this.startStreamReader()

    // Inject our custom middleware using redux-dynamic-middlewares
    // I did this because we need a middleware that can use our feed instance
    // An alternative might be to instantiate Feed and then create the redux store,
    // then you'd just need a Feed.assignStore(store) method or something to give this
    // class a way to dispatch to the store.
    addMiddleware(this.feedMiddleware)
  }

  // This middleware has an extra function at the beginning that takes
  // a 'store' param, which we're not using so it's omitted.
  // This is an implementation detail with redux-dynamic-middlewares
  feedMiddleware: Middleware = store => next => action => {
    // this.feed.append(JSON.stringify(action.payload.action))
    const prevState = store.getState()
    const result = next(action)
    const nextState = store.getState()
    const changes = automerge.getChanges(prevState, nextState)
    changes.forEach(c => this.feed.append(JSON.stringify(c)))
    return result
  }

  // Read items from this and peer feeds,
  // then dispatch them to our redux store
  startStreamReader = () => {
    // Wire up reading from the feed
    const stream = this.feed.createReadStream({ live: true })
    stream.on('data', (value: string) => {
      try {
        const change = JSON.parse(value)
        console.log('onData', change)
        this.reduxStore.dispatch(actions.applyChange(change))
      } catch (err) {
        console.log('feed read error', err)
        console.log('feed stream returned an unknown value', value)
      }
    })
  }

  // Join our feed to the swarm and accept peers
  joinSwarm = () => {
    // could add option to disallow peer connectivity here
    const hub = signalhub(this.getKeyHex(), this.peerHubs)
    const sw = swarm(hub)
    sw.on('peer', this.onPeerConnect)
  }

  // When a feed peer connects, replicate our feed to them
  onPeerConnect = (peer: any, id: any) => {
    console.log('peer', id, peer)
    pump(
      peer,
      this.feed.replicate({
        encrypt: false,
        live: true,
        upload: true,
        download: true,
      }),
      peer
    )
  }

  getKeyHex = () => this.key.toString('hex')
}

export { CevitxeFeed as Feed }
