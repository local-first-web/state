import { CevitxeOtions, ProxyReducer } from './types'
import { Middleware, Store } from 'redux'
import { createStore } from './createStore'
import { Connection } from './connection'
import { EventEmitter } from 'events'

export class Cevitxe<T> {
  private proxyReducer: ProxyReducer<any>
  private middlewares?: Middleware[] // TODO: accept an `enhancer` object instead
  private defaultState?: Partial<T>

  public discoveryKey?: string
  private onReceive?: Function
  private databaseName?: string
  private peerHubs?: string[]

  private feed?: Feed<string>
  private store?: Store
  private hub?: any
  private swarm?: any
  private connections?: Connection[]

  constructor({
    proxyReducer,
    middlewares,
    defaultState,
    discoveryKey,
    onReceive,
    databaseName,
    peerHubs,
  }: CevitxeOtions<T>) {
    this.proxyReducer = proxyReducer
    this.middlewares = middlewares
    this.defaultState = defaultState
    this.discoveryKey = discoveryKey
    this.onReceive = onReceive
    this.databaseName = databaseName
    this.peerHubs = peerHubs
  }

  createStore = async () => {
    // call createStore with the defaultState
    const { feed, store, hub, swarm, connections } = await createStore({
      databaseName: this.databaseName,
      peerHubs: this.peerHubs,
      proxyReducer: this.proxyReducer,
      defaultState: this.defaultState,
      middlewares: this.middlewares,
      discoveryKey: this.discoveryKey,
      onReceive: this.onReceive,
    })
    this.feed = feed
    this.store = store
    this.hub = hub
    this.swarm = swarm
    this.connections = connections
    return store
  }

  joinStore = async () => {
    // call createStore without the defaultState
    const { feed, store, hub, swarm, connections } = await createStore({
      databaseName: this.databaseName,
      peerHubs: this.peerHubs,
      proxyReducer: this.proxyReducer,
      middlewares: this.middlewares,
      discoveryKey: this.discoveryKey,
      onReceive: this.onReceive,
    })
    this.feed = feed
    this.store = store
    this.hub = hub
    this.swarm = swarm
    this.connections = connections
    return store
  }

  getStore = () => this.store

  close = async () => {
    this.store = undefined
    if (this.feed) await promisify(this.feed, 'close')
    if (this.hub) await promisify(this.hub.close)
    if (this.swarm) await promisify(this.swarm.close)
    if (this.connections) this.connections.forEach(c => c.close())
    this.feed = undefined
    this.hub = undefined
    this.swarm = undefined
    this.connections = undefined
  }
}

interface Emitter {
  on: (event: any, cb: () => void) => void
}

function promisify(emitter: Emitter, event: string): Promise<void>
function promisify(cb: (...args: any[]) => void): Promise<void>
function promisify(obj: Emitter | Function, event?: string): Promise<void> | void {
  if (typeof obj !== 'function' && obj.on && event) {
    return new Promise(ok => obj.on(event!, ok))
  } else if (typeof obj === 'function') {
    const fn = obj
    return new Promise(ok => fn(ok))
  }
}
