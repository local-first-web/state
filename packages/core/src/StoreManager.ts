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
  private proxyReducer: ProxyReducer
  private initialState: RepoSnapshot<T>
  private urls: string[]
  private middlewares: Middleware[] // TODO: accept an `enhancer` object instead

  private clientId = cuid()
  private repo?: Repo
  public client?: Client
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
  }

  joinStore = (discoveryKey: string) => this.makeStore(discoveryKey, false)

  createStore = (discoveryKey: string) => this.makeStore(discoveryKey, true)

  private makeStore = async (discoveryKey: string, isCreating: boolean = false) => {
    log = debug(`cevitxe:${isCreating ? 'createStore' : 'joinStore'}:${discoveryKey}`)

    // Create Repo
    this.repo = new Repo(discoveryKey, this.databaseName, this.clientId)
    this.repo.addHandler(this.onChange)
    const state = await this.repo.init(this.initialState, isCreating)

    // Create Redux store
    this.store = createReduxStore(this.repo, this.proxyReducer, state, this.middlewares)

    // Connect to discovery server
    this.client = new Client({
      discoveryKey,
      dispatch: this.store.dispatch,
      repo: this.repo,
      urls: this.urls,
    })

    return this.store
  }

  public get knownDiscoveryKeys() {
    return getKnownDiscoveryKeys(this.databaseName)
  }

  private onChange = (documentId: string, doc: A.Doc<T>) => {
    this.emit('change', documentId, doc)
  }

  close = async () => {
    this.removeAllListeners()
    if (this.client) this.client.close()
    // if (this.repo) this.repo.close() // why does this break tests?
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

const createReduxStore = <T>(
  repo: Repo,
  proxyReducer: ProxyReducer,
  initialState: RepoSnapshot<T>,
  middlewares: Middleware[]
) => {
  const reducer = getReducer(proxyReducer, repo)
  const cevitxeMiddleware = getMiddleware(repo, proxyReducer)
  const enhancer = composeWithDevTools(applyMiddleware(...middlewares, cevitxeMiddleware))
  return createStore(reducer, initialState, enhancer)
}

// Use shorter IDs
A.uuid.setFactory(cuid)

// It's normal for a document with a lot of participants to have a lot of connections, so increase
// the limit to avoid spurious warnings about emitter leaks.
EventEmitter.defaultMaxListeners = 500
