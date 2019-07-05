import { CevitxeOptions, ProxyReducer } from './types'
import { Middleware, Store } from 'redux'
import { createStore } from './createStore'
import { Connection } from './connection'

export class Cevitxe<T> {
  private proxyReducer: ProxyReducer<any>
  private middlewares?: Middleware[] // TODO: accept an `enhancer` object instead
  private defaultState?: Partial<T>

  private onReceive?: Function
  private databaseName?: string
  private peerHubs?: string[]

  private feed?: Feed<string>
  private hub?: any
  private swarm?: any
  private connections?: Connection[]
  private stores: { [k: string]: Store }

  constructor({
    proxyReducer,
    middlewares,
    defaultState,
    onReceive,
    databaseName,
    peerHubs,
  }: CevitxeOptions<T>) {
    this.proxyReducer = proxyReducer
    this.middlewares = middlewares
    this.defaultState = defaultState
    this.onReceive = onReceive
    this.databaseName = databaseName
    this.peerHubs = peerHubs
    this.stores = {}
  }

  createStore = async (documentId: string) => {
    // call createStore with the defaultState
    const { feed, store, hub, swarm, connections } = await createStore({
      documentId,
      databaseName: this.databaseName,
      peerHubs: this.peerHubs,
      proxyReducer: this.proxyReducer,
      defaultState: this.defaultState,
      middlewares: this.middlewares,
      onReceive: this.onReceive,
    })
    this.feed = feed
    this.stores[documentId] = store
    this.hub = hub
    this.swarm = swarm
    this.connections = connections
    return store
  }

  joinStore = async (documentId: string) => {
    // call createStore without the defaultState
    const { feed, store, hub, swarm, connections } = await createStore({
      documentId,
      databaseName: this.databaseName,
      peerHubs: this.peerHubs,
      proxyReducer: this.proxyReducer,
      middlewares: this.middlewares,
      onReceive: this.onReceive,
    })
    this.feed = feed
    this.stores[documentId] = store
    this.hub = hub
    this.swarm = swarm
    this.connections = connections
    return store
  }

  getStore = (documentId: string) => this.stores[documentId]

  close = async (documentId: string) => {
    delete this.stores[documentId]
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

function promisify(emitter: Emitter, event: string): Promise<void> // overload for emmiter event
function promisify(cb: (...args: any[]) => void): Promise<void> // overload for node callback
// implementation
function promisify(obj: Emitter | Function, event?: string): Promise<void> | void {
  if (typeof obj !== 'function' && obj.on && event) {
    return new Promise(ok => obj.on(event!, ok))
  } else if (typeof obj === 'function') {
    const fn = obj
    return new Promise(ok => fn(ok))
  }
}
