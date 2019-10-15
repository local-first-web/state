import A from 'automerge'
import cuid from 'cuid'
import debug from 'debug'
import { EventEmitter } from 'events'
import { applyMiddleware, createStore, Middleware, Store } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import { getReducer } from './getReducer'
import { DEFAULT_SIGNAL_SERVERS } from './constants'
import { getMiddleware } from './getMiddleware'
import { getKnownDiscoveryKeys } from './keys'
import { Repo } from './Repo'
import { RepoSnapshot, ProxyReducer } from './types'
import { Client } from './Client'

let log = debug('cevitxe:StoreManager')

/**
 * A StoreManager generates a Redux store with persistence (via the Repo class), networking (via
 * cevitxe-signal-client), and magical synchronization with peers (via automerge)
 */
export class StoreManager<T> extends EventEmitter {
  private databaseName: string
  private proxyReducer: ProxyReducer
  private initialState: RepoSnapshot<T>
  private urls: string[]
  private middlewares: Middleware[] // TODO: accept an `enhancer` object instead
  private repo?: Repo
  private client?: Client

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
  }

  joinStore = (discoveryKey: string) => this.getStore(discoveryKey, false)
  createStore = (discoveryKey: string) => this.getStore(discoveryKey, true)

  private getStore = async (discoveryKey: string, isCreating: boolean = false) => {
    log = debug(`cevitxe:${isCreating ? 'createStore' : 'joinStore'}:${discoveryKey}`)

    // Create repo for storage
    this.repo = new Repo(discoveryKey, this.databaseName)
    this.repo.addHandler(this.onChange)
    const state = await this.repo.init(this.initialState, isCreating)

    // Create Redux store to expose to app
    this.store = this.createReduxStore(state)

    // Connect to discovery server to find peers and sync up with them
    this.client = new Client({
      discoveryKey,
      dispatch: this.store.dispatch,
      repo: this.repo,
      urls: this.urls,
    })

    return this.store
  }

  private createReduxStore(initialState: RepoSnapshot<T>) {
    if (!this.repo) throw new Error(`Can't create Redux store without repo`)
    const reducer = getReducer(this.proxyReducer, this.repo)
    const cevitxeMiddleware = getMiddleware(this.repo, this.proxyReducer)
    const enhancer = composeWithDevTools(applyMiddleware(...this.middlewares, cevitxeMiddleware))
    return createStore(reducer, initialState, enhancer)
  }

  public get connectionCount() {
    return this.client ? this.client.connectionCount : 0
  }

  public get knownDiscoveryKeys() {
    return getKnownDiscoveryKeys(this.databaseName)
  }

  private onChange = (documentId: string, doc: A.Doc<T>) => {
    this.emit('change', documentId, doc)
  }

  /**
   * Close all connections and the repo's database
   */
  close = async () => {
    this.removeAllListeners()
    if (this.client) this.client.close()

    // TODO: Close repo when closing StoreManager
    // > This is obviously the right thing to do, but it breaks tests. For some reason RepoSync
    // continues to respond to messages from the peer after the repo is closed, and then tries to
    // access the closed database.

    // if (this.repo) this.repo.close()

    delete this.repo
    delete this.store
  }
}

export interface StoreManagerOptions<T> {
  /** A Cevitxe proxy reducer that returns a ChangeMap (map of change functions) for each action. */
  proxyReducer: ProxyReducer
  /** Redux middlewares to add to the store. */
  middlewares?: Middleware[]
  /** The starting state of a blank document. */
  initialState: RepoSnapshot<T>
  /** A name for the storage feed, to distinguish this application's data from any other Cevitxe data stored on the same machine. */
  databaseName: string
  /** The address(es) of one or more signal servers to try. */
  urls?: string[]
}

// Use shorter IDs
A.uuid.setFactory(cuid)

// It's normal for a document with a lot of participants to have a lot of connections, so increase
// the limit to avoid spurious warnings about emitter leaks.
EventEmitter.defaultMaxListeners = 500
