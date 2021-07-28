import { newid } from '@localfirst/relay-client'
import A from 'automerge'
import cuid from 'cuid'
import debug from 'debug'
import { EventEmitter } from 'events'
import { applyMiddleware, createStore, Middleware, Store } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import * as Auth from '@philschatz/auth'
import querystring from 'query-string'
import { ConnectionManager, Invitation } from './ConnectionManager'
import { CLOSE, DEFAULT_RELAYS, OPEN, PEER, PEER_REMOVE, PEER_UPDATE } from './constants'
import { getMiddleware } from './getMiddleware'
import { getReducer } from './getReducer'
import { Repo } from './Repo'
import { ProxyReducer, RepoSnapshot, Snapshot, ensure } from './types'
import { getTeamManager } from './TeamManager'

let log = debug('lf:StoreManager')

// TODO

/*
This API is janky and the 'storeManager' name is awkward. Prefer to focus on the Redux store that
you get from this - 

```ts
import {createStore, joinStore} from 'local-first-state'

const store = await createStore( ... ) 
// OR 
const store = await joinStore( ... )
```

Here `store` is a ConnectedStore, which is an *enhanced* Redux store.

- It is a `Redux.Store`, an you can work with it as such; it has `getState` and `dispatch` etc. 
- It is also an `EventEmitter` so you can subscribe to `connect`, `disconnect`, `connectPeer`,
  `disconnectPeer`.

Next: 

- [ ] createStore and joinStore should match Redux.createStore API as much as possible
- [ ] rename ConnectionEvents: `connect`, `disconnect`, `connectPeer`, `disconnectPeer`.
*/

/**
 * A StoreManager generates a Redux store with persistence (via the Repo class), networking (via
 * @localfirst/relay-client), and magical synchronization with peers (via automerge)
 */
export class StoreManager<T> extends EventEmitter {
  private databaseName: string
  private proxyReducer: ProxyReducer
  private initialState: Snapshot | RepoSnapshot
  private urls: string[]
  private middlewares: Middleware[] // TODO: accept an `enhancer` object instead
  private repo?: Repo
  private connectionManager?: ConnectionManager
  private collections: string[]
  private log: debug.Debugger

  public store?: Store

  constructor({
    databaseName,
    proxyReducer,
    initialState,
    urls = DEFAULT_RELAYS,
    middlewares = [],
    collections = [],
  }: StoreManagerOptions<T>) {
    super()
    this.proxyReducer = proxyReducer
    this.middlewares = middlewares
    this.initialState = initialState
    this.databaseName = databaseName
    this.urls = urls
    this.collections = collections
    this.log = debug(`lf:storemanager`)
  }

  joinStore = (discoveryKey: string) => this.getStore(discoveryKey, false)
  createStore = (discoveryKey: string) => this.getStore(discoveryKey, true)

  private getStore = async (discoveryKey: string, isCreating: boolean = false) => {
    this.log(`${isCreating ? 'creating' : 'joining'} ${discoveryKey}`)

    // userStore and Toolbar both call joinStore and end up creating different Repo instances. Let's just reuse them.
    if (this.store) {
      return this.store
    }

    const clientId = localStorage.getItem('clientId') || newid()
    localStorage.setItem('clientId', clientId)

    // Create repo for storage
    this.repo = new Repo({
      clientId,
      discoveryKey,
      databaseName: this.databaseName,
      collections: this.collections,
    })

    const state = await this.repo.init(this.initialState, isCreating)
    // Create Redux store to expose to app
    this.store = this.createReduxStore(state)
    return this.store
  }

  async listenToConnections(discoveryKey: string) {

    let invitationOrTeam: Invitation | Auth.Team
    let maybeTeam: Auth.Team | undefined = await getTeamManager().instantiateTeamIfAvailable(ensure(this.repo), discoveryKey)
    
    if (maybeTeam) {
      invitationOrTeam = maybeTeam
    } else {
      const {invitationUser, invitationSeed} = querystring.parse(window.location.search, {
        parseBooleans: false,
        parseNumbers: false,
        arrayFormat: "none"
      })
      if (invitationUser && invitationSeed) {
        invitationOrTeam = {username: invitationUser.toString(), invitationSeed: invitationSeed.toString()}
      } else if (confirm('You were not given an invitation to this page. Do you want to create a new Team?')) {
        // Create a new team
        const user = Auth.createUser({
          userName: 'Alice',
          deviceName: 'Laptop',
          deviceType: 1
        })
        const t = Auth.createTeam('dream', {user})
        const team = await getTeamManager().instantiateTeamDefinitely(ensure(this.repo), discoveryKey, t.chain)
        invitationOrTeam = team
      } else {
        alert('You have chosen not to create or join a team. There is nothing left to do. Closing.')
        throw new Error('Did not choose to join a team or create a new team')
      }
    }

    // Generate an invitation and alert the user so they can use it:
    if (invitationOrTeam instanceof Auth.Team) {
      if (invitationOrTeam.memberIsAdmin(invitationOrTeam.userName)) {
        const username = `Friend${(new Number(Math.round(Math.random() * 0x10000)).toString())}`
        const {invitationSeed} = invitationOrTeam.invite(username)
        const qs = querystring.stringify({
          ...querystring.parse(window.location.search),
          invitationUser: username,
          invitationSeed
        })
        window.history.replaceState(null, '', `?${qs}`)
        alert(`Invite a person by copying and pasting the URL in the browser to your friend`)
      }
    }
    

    // Connect to discovery server to find peers and sync up with them
    this.connectionManager = new ConnectionManager({
      invitationOrTeam,
      discoveryKey,
      dispatch: ensure(this.store).dispatch,
      repo: ensure(this.repo),
      urls: this.urls,
    })

    pipeEvents({
      source: this.connectionManager,
      target: this,
      events: [OPEN, CLOSE, PEER, PEER_REMOVE, PEER_UPDATE],
    })
  }

  private createReduxStore(state: RepoSnapshot) {
    if (!this.repo) throw new Error(`Can't create Redux store without repo`)
    // TODO put arguments in the same order (this.proxyReducer, this.repo)
    const reducer = getReducer(this.proxyReducer, this.repo)
    const middleware = getMiddleware(this.repo, this.proxyReducer)
    const enhancer = composeWithDevTools(applyMiddleware(...this.middlewares, middleware))
    return createStore(reducer, state, enhancer)
  }

  public get connectionCount() {
    if (!this.connectionManager) throw new Error('no connectionManager')
    return this.connectionManager.connectionCount
  }

  /**
   * Close all connections and the repo's database
   */
  close = async () => {
    this.log('closing')
    if (this.connectionManager) await this.connectionManager.close()
    // if (this.repo) await this.repo.close()

    delete this.repo
    delete this.store
  }
}

export interface StoreManagerOptions<T> {
  /** A proxy reducer that returns a ChangeMap (map of change functions) for each action. */
  proxyReducer: ProxyReducer

  /** Redux middlewares to add to the store. */
  middlewares?: Middleware[]

  /** The starting state of a blank document. */
  initialState: Snapshot | RepoSnapshot

  /** A name for the storage feed, to distinguish this application's data from any other
   * @localfirst/state data stored on the same machine. */
  databaseName: string

  /** The address(es) of one or more relays to try. */
  urls?: string[]

  /** The names of any collections that we need to manage */
  collections?: string[]
}

// Use shorter IDs
A.uuid.setFactory(cuid)

const pipeEvents = ({
  source,
  target,
  events,
}: {
  source: EventEmitter
  target: EventEmitter
  events: string[]
}) => events.forEach((event) => source.on(event, (...payload) => target.emit(event, ...payload)))
