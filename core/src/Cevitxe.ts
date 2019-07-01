import { CevitxeOtions, ProxyReducer } from './types'
import { Middleware, Store } from 'redux'
import { createStore } from './createStore'

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
    const { feed, store } = await createStore({
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
    return store
  }

  joinStore = async () => {
    // call createStore without the defaultState
    const { feed, store } = await createStore({
      databaseName: this.databaseName,
      peerHubs: this.peerHubs,
      proxyReducer: this.proxyReducer,
      middlewares: this.middlewares,
      discoveryKey: this.discoveryKey,
      onReceive: this.onReceive,
    })
    this.feed = feed
    this.store = store
    return store
  }

  getStore = () => this.store

  close = () => {
    this.store = undefined
    this.feed = undefined
    // TODO: Close and destroy feed?
    // TODO: Destroy store?
  }
}
