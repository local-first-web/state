import A from 'automerge'
import { Client, newid, Peer } from 'cevitxe-signal-client'
import cuid from 'cuid'
import debug from 'debug'
import { EventEmitter } from 'events'
import { applyMiddleware, createStore, Middleware, Store } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import { adaptReducer } from './adaptReducer'
import { Connection } from './Connection'
import { DEFAULT_SIGNAL_SERVERS } from './constants'
import { getMiddleware } from './getMiddleware'
import { getKnownDiscoveryKeys } from './keys'
import { Repo } from './Repo'
import { RepoSnapshot, ProxyReducer, StoreManagerOptions } from './types'

let log = debug('cevitxe:StoreManager')

// It's normal for a document with a lot of participants to have a lot of connections, so increase
// the limit to avoid spurious warnings about emitter leaks.
EventEmitter.defaultMaxListeners = 500

// Use shorter IDs
A.uuid.setFactory(cuid)

/**
 * A StoreManager generates a Redux store with persistence (via the Repo class), networking (via
 * cevitxe-signal-client), and magical synchronization with peers (via automerge)
 */
export class StoreManager<T> extends EventEmitter {
  private proxyReducer: ProxyReducer
  private initialState: RepoSnapshot<T>
  private urls: string[]
  private middlewares: Middleware[] // TODO: accept an `enhancer` object instead

  private clientId = newid()
  private repo?: Repo

  public connections: { [peerId: string]: Connection }
  public databaseName: string
  public store?: Store

  constructor({
    databaseName,
    proxyReducer,
    initialState,
    urls = DEFAULT_SIGNAL_SERVERS,
    middlewares = [],
  }: StoreManagerOptions<T>) {
    super()
    this.proxyReducer = proxyReducer
    this.middlewares = middlewares
    this.initialState = initialState
    this.databaseName = databaseName
    this.urls = urls
    this.connections = {}
  }

  joinStore = (discoveryKey: string) => this.makeStore(discoveryKey, false)

  createStore = (discoveryKey: string) => this.makeStore(discoveryKey, true)

  private makeStore = async (discoveryKey: string, isCreating: boolean = false) => {
    log = debug(`cevitxe:${isCreating ? 'createStore' : 'joinStore'}:${discoveryKey}`)

    this.repo = new Repo(discoveryKey, this.databaseName, this.clientId)

    this.repo.addHandler(this.onChange)

    const state = await this.repo.init(this.initialState, isCreating)

    // Create Redux store
    const reducer = adaptReducer(this.proxyReducer, this.repo)
    const cevitxeMiddleware = getMiddleware(this.repo, this.proxyReducer)
    const enhancer = composeWithDevTools(applyMiddleware(...this.middlewares, cevitxeMiddleware))
    this.store = createStore(reducer, state, enhancer)

    // Connect to discovery server
    const client = new Client({ id: this.clientId, url: this.urls[0] }) // TODO: randomly select a URL if more than one is provided? select best based on ping?
    client.join(discoveryKey)
    client.on('peer', (peer: Peer) => this.addPeer(peer, discoveryKey))

    this.emit('ready', this.store)

    return this.store
  }

  public get connectionCount() {
    return Object.keys(this.connections).length
  }

  public get knownDiscoveryKeys() {
    return getKnownDiscoveryKeys(this.databaseName)
  }

  private onChange = (documentId: string, doc: A.Doc<T>) => {
    this.emit('change', documentId, doc)
  }

  private addPeer = (peer: Peer, discoveryKey: string) => {
    if (!this.store || !this.repo) return
    log('connecting to peer', peer.id)

    // For each peer that wants to connect, create a Connection object
    const socket = peer.get(discoveryKey)
    const connection = new Connection(this.repo, socket, this.store.dispatch)
    this.connections[peer.id] = connection
    this.emit('peer', peer) // hook for testing
    log('connected to peer', peer.id)

    peer.on('close', () => this.removePeer(peer.id))
  }

  private removePeer = (peerId: string) => {
    log('removing peer', peerId)
    if (this.connections[peerId]) this.connections[peerId].close()
    delete this.connections[peerId]
  }

  close = async () => {
    this.removeAllListeners()

    const closeAllConnections = Object.keys(this.connections).map(peerId => this.removePeer(peerId))
    await Promise.all(closeAllConnections)
    this.connections = {}

    delete this.repo
    delete this.store

    this.emit('close')
  }
}
